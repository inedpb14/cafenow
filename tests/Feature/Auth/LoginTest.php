<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

final class LoginTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['password' => Hash::make('password123'), 'role' => 'customer']);
    }

    public function test_customer_can_login(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->user->email,
            'password' => 'password123',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['success', 'data' => ['token', 'user']]);
    }

    public function test_login_fails_with_wrong_password(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => $this->user->email,
            'password' => 'wrongpassword',
        ]);

        $response->assertStatus(422);
    }

    public function test_login_fails_with_nonexistent_email(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'nonexistent@example.com',
            'password' => 'password123',
        ]);

        $response->assertStatus(422);
    }

    public function test_owner_can_login(): void
    {
        $owner = User::factory()->create(['password' => Hash::make('password123'), 'role' => 'owner']);

        $response = $this->postJson('/api/owner/login', [
            'email' => $owner->email,
            'password' => 'password123',
        ]);

        $response->assertOk();
    }

    public function test_admin_can_login(): void
    {
        $admin = User::factory()->create(['password' => Hash::make('password123'), 'role' => 'admin']);

        $response = $this->postJson('/api/admin/login', [
            'email' => $admin->email,
            'password' => 'password123',
        ]);

        $response->assertOk();
    }
}
