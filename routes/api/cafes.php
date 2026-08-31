<?php

declare(strict_types=1);

use App\Http\Controllers\Cafe\CafeController;
use App\Http\Controllers\Menu\MenuController;
use App\Http\Controllers\Table\TableController;
use Illuminate\Support\Facades\Route;

// Public
Route::get('/cafes', [CafeController::class, 'publicList']);
Route::get('/cafes/{cafe}', [CafeController::class, 'show']);
Route::get('/cafes/{cafe}/availability', [CafeController::class, 'availability']);
Route::get('/cafes/{cafe}/tables', [TableController::class, 'index']);
Route::get('/cafes/{cafe}/tables/{table}/slots', [TableController::class, 'slots']);
Route::get('/cafes/{cafe}/menus', [MenuController::class, 'index']);
