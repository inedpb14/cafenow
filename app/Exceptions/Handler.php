<?php

declare(strict_types=1);

namespace App\Exceptions;

use Illuminate\Auth\Access\AuthorizationException;
use Illuminate\Auth\AuthenticationException;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Foundation\Exceptions\Handler as ExceptionHandler;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Throwable;

class Handler extends ExceptionHandler
{
    protected function unauthenticated($request, AuthenticationException $exception): JsonResponse
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'error' => ['code' => 'UNAUTHENTICATED', 'message' => 'Silakan login terlebih dahulu'],
        ], 401);
    }

    public function render($request, Throwable $e): Response
    {
        if ($request->expectsJson() || $request->is('api/*')) {
            return match (true) {
                $e instanceof ValidationException => $this->renderValidationException($e),
                $e instanceof ModelNotFoundException => $this->renderNotFound($e),
                $e instanceof AuthenticationException => $this->unauthenticated($request, $e),
                $e instanceof AuthorizationException => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'FORBIDDEN', 'message' => 'Tidak memiliki akses'],
                ], 403),
                $e instanceof SlotNotAvailableException => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'SLOT_UNAVAILABLE', 'message' => $e->getMessage() ?: 'Slot tidak tersedia'],
                ], 409),
                $e instanceof BookingTimeWindowException => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'BOOKING_WINDOW', 'message' => $e->getMessage()],
                ], 422),
                $e instanceof CancellationTimeExpiredException => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'CANCELLATION_EXPIRED', 'message' => $e->getMessage() ?: 'Waktu pembatalan telah lewat'],
                ], 422),
                $e instanceof ExtendBookingLimitException => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'EXTEND_LIMIT', 'message' => $e->getMessage() ?: 'Batas perpanjangan tercapai'],
                ], 422),
                $e instanceof PaymentFailedException => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'PAYMENT_FAILED', 'message' => $e->getMessage() ?: 'Pembayaran gagal'],
                ], 402),
                $e instanceof WebhookSignatureException => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'INVALID_SIGNATURE', 'message' => 'Invalid webhook signature'],
                ], 401),
                $e instanceof HttpException => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'HTTP_ERROR', 'message' => $e->getMessage() ?: 'Terjadi kesalahan'],
                ], $e->getStatusCode()),
                default => response()->json([
                    'success' => false, 'data' => null,
                    'error' => ['code' => 'SERVER_ERROR', 'message' => 'Terjadi kesalahan internal server'],
                ], 500),
            };
        }

        return parent::render($request, $e);
    }

    private function renderValidationException(ValidationException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'error' => [
                'code' => 'VALIDATION_ERROR',
                'message' => 'Validasi gagal',
                'fields' => $e->errors(),
            ],
        ], 422);
    }

    /**
 * @param ModelNotFoundException<\Illuminate\Database\Eloquent\Model> $e
 */
private function renderNotFound(ModelNotFoundException $e): JsonResponse
    {
        return response()->json([
            'success' => false,
            'data' => null,
            'error' => ['code' => 'NOT_FOUND', 'message' => 'Data tidak ditemukan'],
        ], 404);
    }
}
