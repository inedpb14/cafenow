<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Models\MenuOrder;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AutoScheduleMenuPreparing extends Command
{
    protected $signature = 'orders:auto-schedule-preparing';

    protected $description = 'Set menu orders to preparing when 30 minutes before booking start_time';

    public function handle(): int
    {
        $count = MenuOrder::where('status', 'scheduled')
            ->whereHas('booking', function ($q) {
                $q->where('booking_date', today())
                    ->where('start_time', '<=', Carbon::now()->addMinutes(30)->format('H:i:s'))
                    ->where('status', 'confirmed');
            })
            ->update(['status' => 'preparing']);

        $this->info("Set {$count} orders to preparing.");

        return self::SUCCESS;
    }
}
