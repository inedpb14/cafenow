<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('full_name')->nullable()->after('name');
            $table->string('role')->default('customer')->after('email');
            $table->string('phone', 20)->nullable()->unique()->after('role');
            $table->boolean('is_phone_verified')->default(false)->after('phone');
            $table->string('profile_pic')->nullable()->after('is_phone_verified');
            $table->date('date_of_birth')->nullable()->after('profile_pic');
            $table->boolean('is_suspended')->default(false)->after('date_of_birth');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'full_name', 'role', 'phone', 'is_phone_verified',
                'profile_pic', 'date_of_birth', 'is_suspended',
            ]);
        });
    }
};
