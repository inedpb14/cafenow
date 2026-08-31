<?php

declare(strict_types=1);

namespace App\Services\Booking;

use App\Enums\PayableType;
use App\Models\Booking;
use App\Models\Cafe;
use App\Models\MenuItem;
use App\Models\MenuOrder;
use App\Models\MenuOrderItem;
use App\Models\Payment;
use App\Models\Table;
use App\Models\User;
use App\Services\Payment\CommissionService;
use App\Services\Payment\MidtransService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

readonly class BookingWizardService
{
    public function __construct(
        private BookingService $bookingService,
        private CommissionService $commissionService,
        private MidtransService $midtransService,
    ) {}

    /**
     * Place a full reservation in one go: booking + pre-order + payment
     * initiation. Returns ['booking', 'order', 'payment_url'].
     *
     * @param array<string, mixed> $data
     * @return array{booking: Booking, order: MenuOrder|null, payment_url: string|null}
     */
    public function place(User $customer, Cafe $cafe, array $data): array
    {
        /** @var Table $table */
        $table = Table::findOrFail($data['table_id']);

        if ($table->cafe_id !== $cafe->id) {
            abort(403);
        }

        $booking = $this->bookingService->create([
            'cafe_id' => $cafe->id,
            'table_id' => $table->id,
            'booking_rule_id' => $data['booking_rule_id'] ?? null,
            'booking_date' => $data['booking_date'],
            'start_time' => $data['start_time'],
            'duration_minutes' => $data['duration_minutes'],
            'guest_count' => $data['guest_count'],
            'customer_notes' => $data['customer_notes'] ?? null,
        ], $customer->id);

        $order = null;
        $items = $data['items'] ?? [];

        if (! empty($items)) {
            $order = $this->createPreOrder($customer, $booking, $items, $data['customer_notes'] ?? null);
        }

        $paymentUrl = $this->initiatePayment($customer, $booking);

        return ['booking' => $booking, 'order' => $order, 'payment_url' => $paymentUrl];
    }

    /**
     * @param array<string, mixed> $items
     */
    private function createPreOrder(User $customer, Booking $booking, array $items, ?string $notes): MenuOrder
    {
        $menuItemIds = collect($items)->pluck('menu_item_id');
        $menuItems = MenuItem::whereIn('id', $menuItemIds)
            ->where('cafe_id', $booking->cafe_id)
            ->get()
            ->keyBy('id');

        $totalPrice = 0;
        $orderItems = [];

        foreach ($items as $item) {
            $menuItem = $menuItems->get($item['menu_item_id']);

            if ($menuItem === null) {
                abort(422, "Menu item ID {$item['menu_item_id']} tidak ditemukan di cafe ini");
            }

            $subtotal = $menuItem->price * $item['quantity'];
            $totalPrice += $subtotal;

            $orderItems[] = [
                'menu_item_id' => $menuItem->id,
                'quantity' => $item['quantity'],
                'unit_price' => $menuItem->price,
                'subtotal' => $subtotal,
            ];
        }

        $commission = $this->commissionService->calculateMenuCommission($totalPrice);

        return DB::transaction(function () use ($customer, $booking, $orderItems, $totalPrice, $commission, $notes) {
            $order = MenuOrder::create([
                'cafe_id' => $booking->cafe_id,
                'customer_id' => $customer->id,
                'booking_id' => $booking->id,
                'order_type' => 'pre_order',
                'order_reference' => 'ORD-'.now()->format('Ymd').'-'.strtoupper(Str::random(5)),
                'status' => 'pending_payment',
                'total_price' => $totalPrice,
                'commission' => $commission,
                'cafe_receives' => $totalPrice - $commission,
                'payment_status' => 'unpaid',
                'special_notes' => $notes,
            ]);

            foreach ($orderItems as $item) {
                MenuOrderItem::create([
                    'menu_order_id' => $order->id,
                    ...$item,
                ]);
            }

            $booking->increment('menu_subtotal', $totalPrice);
            $booking->increment('total_price', $totalPrice);

            return $order;
        });
    }

    /**
     * Reuse an existing pending payment for an unpaid booking, or start a
     * fresh one. Returns the redirect URL to continue payment.
     */
    public function resumePayment(User $customer, Booking $booking): ?string
    {
        $payment = Payment::where('payable_type', PayableType::Booking->value)
            ->where('payable_id', $booking->id)
            ->where('status', 'pending')
            ->latest()
            ->first();

        if ($payment !== null && $payment->snap_redirect_url !== null) {
            return $payment->snap_redirect_url;
        }

        if ($payment !== null) {
            $payment->delete();
        }

        return $this->initiatePayment($customer, $booking);
    }

    private function initiatePayment(User $customer, Booking $booking): ?string
    {
        $orderId = strtoupper(Str::random(12));

        $payment = Payment::create([
            'payable_type' => PayableType::Booking,
            'payable_id' => $booking->id,
            'amount' => $booking->total_price,
            'status' => 'pending',
            'midtrans_order_id' => $orderId,
        ]);

        try {
            $response = $this->midtransService->createTransaction([
                'order_id' => $orderId,
                'amount' => $booking->total_price,
                'customer' => [
                    'first_name' => $customer->name,
                    'email' => $customer->email,
                ],
            ]);

            $payment->update([
                'gateway_reference' => $response['transaction_id'] ?? null,
                'snap_token' => $response['token'] ?? null,
                'snap_redirect_url' => $response['redirect_url'] ?? null,
            ]);

            return $response['redirect_url'] ?? null;
        } catch (\Exception $exception) {
            Log::error('Midtrans initiate failed', [
                'order_id' => $orderId,
                'error' => $exception->getMessage(),
            ]);

            return null;
        }
    }
}
