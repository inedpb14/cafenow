<?php

declare(strict_types=1);

namespace App\Http\Controllers\Payment;

use App\Http\Controllers\Controller;
use App\Http\Resources\PaymentResource;
use App\Models\Booking;
use App\Models\MenuOrder;
use App\Models\Payment;
use App\Services\Booking\BookingService;
use App\Services\Booking\BookingWizardService;
use App\Services\Payment\MidtransService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;

class PaymentController extends Controller
{
    public function __construct(
        private readonly MidtransService $midtransService,
        private readonly BookingService $bookingService,
        private readonly BookingWizardService $bookingWizardService,
    ) {}

    public function status(Request $request, Payment $payment): JsonResponse
    {
        $user = $request->user();
        $payable = $payment->payable;

        if ($payable !== null && ($payable instanceof \App\Models\Booking || $payable instanceof \App\Models\MenuOrder) && $payable->customer_id !== $user->id) {
            abort(403);
        }

        return response()->json([
            'success' => true,
            'data' => new PaymentResource($payment),
        ]);
    }

    public function webhook(Request $request): JsonResponse
    {
        return $this->handleNotification($request->all());
    }

    /**
     * Dummy-mode payment page: mock payment methods before Midtrans keys are configured.
     */
    public function simulatePage(Request $request, string $orderId): Response|RedirectResponse
    {
        if (! $this->midtransService->isDummyMode()) {
            abort(404);
        }

        $payment = Payment::where('midtrans_order_id', $orderId)->firstOrFail();

        $this->authorizePayable($request, $payment);

        if ($payment->status === 'success') {
            return redirect()->route('customer.bookings.detail', $payment->payable_id);
        }

        return Inertia::render('payments/simulate', [
            'payment' => [
                'order_id' => $payment->midtrans_order_id,
                'amount' => (float) $payment->amount,
                'status' => $payment->status,
            ],
        ]);
    }

    /**
     * Dummy-mode payment submit: build a settlement notification and run
     * it through the same verified path as the real Midtrans webhook.
     */
    public function simulatePay(Request $request, string $orderId): RedirectResponse
    {
        $request->validate([
            'method' => ['required', 'string', 'in:qris,va,ewallet'],
        ]);

        $payment = Payment::where('midtrans_order_id', $orderId)->firstOrFail();

        $this->authorizePayable($request, $payment);

        if ($payment->status === 'success') {
            return redirect()->route('customer.bookings.detail', $payment->payable_id);
        }

        $payment->update(['payment_method' => $request->string('method')->toString()]);

        $payload = [
            'order_id' => $payment->midtrans_order_id,
            'status_code' => '200',
            'gross_amount' => (string) $payment->amount,
            'transaction_status' => 'settlement',
            'transaction_id' => 'dummy-tx-'.$payment->midtrans_order_id,
            'payment_type' => $request->string('method')->toString(),
            'merchant_id' => $this->midtransService->isDummyMode() ? 'dummy-merchant' : '',
        ];

        if (! $this->midtransService->isDummyMode()) {
            abort(404);
        }

        $payload['signature_key'] = hash(
            'sha512',
            $payload['order_id'].$payload['status_code'].$payload['gross_amount'].(string) config('services.midtrans.server_key')
        );

        $this->handleNotification($payload);

        return redirect()->route('customer.bookings.detail', $payment->payable_id)
            ->with('success', 'Pembayaran berhasil. Reservasi Anda terkunci.');
    }

    /**
     * Resume payment for an unpaid booking (reuses pending payment/redirect).
     */
    public function resume(Request $request, Booking $booking): RedirectResponse
    {
        if ($booking->customer_id !== $request->user()->id) {
            abort(403);
        }

        if ($booking->payment_status === 'paid') {
            return redirect()->route('customer.bookings.detail', $booking);
        }

        if (! in_array($booking->status, ['pending', 'confirmed'])) {
            return redirect()->route('customer.bookings.detail', $booking)
                ->with('error', 'Reservasi tidak dapat dilanjutkan ke pembayaran.');
        }

        $url = $this->bookingWizardService->resumePayment($request->user(), $booking);

        if ($url === null) {
            return redirect()->route('customer.bookings.detail', $booking)
                ->with('error', 'Gagal membuat pembayaran. Silakan coba lagi.');
        }

        return redirect()->away($url);
    }

    private function authorizePayable(Request $request, Payment $payment): void
    {
        $payable = $payment->payable;

        if ($payable === null || ! ($payable instanceof \App\Models\Booking || $payable instanceof \App\Models\MenuOrder) || $payable->customer_id !== $request->user()->id) {
            abort(403);
        }
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function handleNotification(array $payload): JsonResponse
    {
        $orderId = $payload['order_id'] ?? null;
        $statusCode = (string) ($payload['status_code'] ?? '');
        $grossAmount = (string) ($payload['gross_amount'] ?? '0');
        $signatureKey = $payload['signature_key'] ?? '';
        $transactionStatus = $payload['transaction_status'] ?? '';

        if ($orderId === null) {
            return response()->json(['success' => false], 200);
        }

        try {
            $this->midtransService->verifySignature($orderId, $statusCode, $grossAmount, $signatureKey);
        } catch (\Exception $exception) {
            Log::warning('Midtrans webhook signature invalid', ['order_id' => $orderId]);

            return response()->json([
                'success' => false,
                'data' => null,
                'error' => ['code' => 'INVALID_SIGNATURE', 'message' => 'Invalid signature'],
            ], 401);
        }

        $payment = Payment::where('midtrans_order_id', $orderId)->first();

        if ($payment === null) {
            return response()->json(['success' => true], 200);
        }

        $newStatus = match ($transactionStatus) {
            'settlement', 'capture' => 'success',
            'deny', 'cancel', 'expire' => 'failed',
            'refund' => 'refunded',
            default => $payment->status,
        };

        $payment->update([
            'status' => $newStatus,
            'paid_at' => $newStatus === 'success' ? now() : $payment->paid_at,
        ]);

        if ($newStatus === 'success') {
            $payable = $payment->payable;

            if ($payable instanceof Booking) {
                $this->bookingService->confirmPayment($payable);
            }

            if ($payable instanceof MenuOrder) {
                $payable->update(['payment_status' => 'paid', 'status' => 'confirmed']);
            }
        }

        return response()->json(['success' => true], 200);
    }
}
