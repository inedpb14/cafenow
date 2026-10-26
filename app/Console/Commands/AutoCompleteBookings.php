<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\Booking;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AutoCompleteBookings extends Command
{
    protected $signature = 'bookings:auto-complete';

    protected $description = 'Automatically complete bookings where end_time has passed';

    public function handle(): int
    {
        $now = Carbon::now()->format('Y-m-d H:i:s');
        // CONCAT: '||' adalah logical OR di MySQL, bukan concat — filter waktu lewat tanpa menyaring apa pun
        $count = Booking::where('status', 'confirmed')
            ->whereRaw("CONCAT(booking_date, ' ', end_time) <= ?", [$now])
            ->whereNotNull('check_in_time')
            ->whereNull('check_out_time')
            ->update([
                'status' => 'completed',
                'check_out_time' => Carbon::now(),
            ]);

        $this->info("Completed {$count} bookings.");

        return self::SUCCESS;
    }
}
