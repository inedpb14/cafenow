<?php

declare(strict_types=1);

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

final class CustomerRegistrationTest extends TestCase
{
    use RefreshDatabase;

    private array $payload = [
        'full_name' => 'Budi Santoso',
        'email' => 'budi@example.com',
        'phone' => '081234567890',
        'password' => 'Rahasia!123',
    ];

    public function test_register_auto_verifies_email(): void
    {
        Mail::fake();

        $response = $this->postJson('/api/auth/register', $this->payload);

        $response->assertStatus(201);
        $response->assertJsonStructure(['success', 'data' => ['user_id', 'email']]);
        $this->assertSame('Registrasi berhasil. Silakan masuk dengan akun Anda.', $response->json('data.message'));

        $user = User::where('email', 'budi@example.com')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);

        Mail::assertNothingSent();
    }

    public function test_freshly_registered_user_can_login(): void
    {
        $this->postJson('/api/auth/register', $this->payload)->assertStatus(201);

        $response = $this->postJson('/api/auth/login', [
            'email' => 'budi@example.com',
            'password' => 'Rahasia!123',
        ]);

        $response->assertOk();
        $response->assertJsonStructure(['success', 'data' => ['token', 'user']]);
    }
}
