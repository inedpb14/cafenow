<?php

declare(strict_types=1);

namespace App\Services\Payment;

use App\Exceptions\PaymentFailedException;
use App\Exceptions\WebhookSignatureException;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

readonly class MidtransService
{
    private string $serverKey;

    private string $snapUrl;

    private string $coreApiUrl;

    public function __construct()
    {
        $this->serverKey = (string) (config('services.midtrans.server_key') ?? '');
        $host = config('services.midtrans.is_production') ? 'app.midtrans.com' : 'app.sandbox.midtrans.com';
        $this->snapUrl = "https://{$host}/snap/v1/transactions";
        $this->coreApiUrl = (config('services.midtrans.is_production') ? 'https://api.midtrans.com/v2' : 'https://api.sandbox.midtrans.com/v2');
    }

    public function isDummyMode(): bool
    {
        return $this->serverKey === '';
    }

    /**
     * @param array<string, mixed> $params
     * @return array<string, mixed>
     */
    public function createTransaction(array $params): array
    {
        if ($this->isDummyMode()) {
            return [
                'token' => 'dummy-'.$params['order_id'],
                'redirect_url' => route('payments.simulate', $params['order_id']),
                'transaction_id' => 'dummy-tx-'.$params['order_id'],
            ];
        }

        $payload = [
            'transaction_details' => [
                'order_id' => $params['order_id'],
                'gross_amount' => (int) $params['amount'],
                'expiry' => [
                    'duration' => 15,
                    'unit' => 'minutes',
                ],
            ],
            'item_details' => $params['items'] ?? [],
            'customer_details' => $params['customer'] ?? [],
        ];

        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->post($this->snapUrl, $payload);

            if (! $response->successful()) {
                throw new PaymentFailedException(
                    'Midtrans: '.($response->json('error_messages.0') ?? $response->json('status_message') ?? 'Unknown error')
                );
            }

            return $response->json();
        } catch (ConnectionException $e) {
            Log::error('Midtrans connection failed', ['order_id' => $params['order_id'], 'error' => $e->getMessage()]);
            throw new PaymentFailedException('Gagal terhubung ke payment gateway');
        }
    }

    public function verifySignature(string $orderId, string $statusCode, string $grossAmount, string $signatureKey): bool
    {
        $expected = hash('sha512', $orderId.$statusCode.$grossAmount.$this->serverKey);

        if (! hash_equals($expected, $signatureKey)) {
            throw new WebhookSignatureException;
        }

        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function refund(string $orderId, float $amount): array
    {
        try {
            $response = Http::withBasicAuth($this->serverKey, '')
                ->post("{$this->coreApiUrl}/charge/{$orderId}/refund", [
                    'amount' => $amount,
                ]);

            return $response->json();
        } catch (ConnectionException $e) {
            Log::error('Midtrans refund failed', ['order_id' => $orderId, 'error' => $e->getMessage()]);
            throw new PaymentFailedException('Gagal memproses refund');
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function status(string $orderId): array
    {
        $response = Http::withBasicAuth($this->serverKey, '')
            ->get("{$this->coreApiUrl}/{$orderId}/status");

        return $response->json();
    }
}
