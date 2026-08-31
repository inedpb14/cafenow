<?php

declare(strict_types=1);

namespace App\Services\Booking;

use App\Models\Booking;
use Illuminate\Support\Facades\Cache;

readonly class LockService
{
    private const LOCK_PREFIX = 'table_lock:';

    private const LOCK_TTL = 900;

    public function acquire(int $tableId, string $date, string $startTime): bool
    {
        $key = $this->key($tableId, $date, $startTime);

        return Cache::add($key, true, self::LOCK_TTL);
    }

    public function release(int $tableId, string $date, string $startTime): void
    {
        Cache::forget($this->key($tableId, $date, $startTime));
    }

    public function isLocked(int $tableId, string $date, string $startTime): bool
    {
        return Cache::has($this->key($tableId, $date, $startTime));
    }

    public function extend(int $tableId, string $date, string $startTime, int $ttl = 900): void
    {
        $key = $this->key($tableId, $date, $startTime);

        if (Cache::has($key)) {
            Cache::put($key, true, $ttl);
        }
    }

    public function acquireForBooking(Booking $booking): bool
    {
        return $this->acquire(
            $booking->table_id,
            $booking->booking_date->format('Y-m-d'),
            $booking->start_time->format('H:i'),
        );
    }

    public function releaseForBooking(Booking $booking): void
    {
        $this->release(
            $booking->table_id,
            $booking->booking_date->format('Y-m-d'),
            $booking->start_time->format('H:i'),
        );
    }

    private function key(int $tableId, string $date, string $startTime): string
    {
        return sprintf('%s%d:%s:%s', self::LOCK_PREFIX, $tableId, $date, $startTime);
    }
}
