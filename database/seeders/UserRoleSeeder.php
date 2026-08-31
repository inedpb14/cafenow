<?php

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserRoleSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['admin', 'owner', 'customer'] as $role) {
            // ponytail: fixed dev password for all roles (incl. admin) — see requirements/akun.md
            User::updateOrCreate(
                ['email' => "{$role}@test.local"],
                [
                    'name' => $role,
                    'full_name' => ucfirst($role),
                    'email' => "{$role}@test.local",
                    'password' => Hash::make('1234'),
                    'role' => UserRole::from($role),
                    'email_verified_at' => now(),
                ]
            );
        }
    }
}
