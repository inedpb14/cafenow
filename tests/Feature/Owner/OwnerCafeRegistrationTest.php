<?php

declare(strict_types=1);

namespace Tests\Feature\Owner;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

final class OwnerCafeRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_register_cafe_with_city(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post(route('owner.cafes.store'), [
                'name' => 'Kopi Nusantara',
                'address' => 'Jl. Sudirman No. 1',
                'city' => 'Jakarta Pusat',
                'phone' => '08123456789',
            ])
            ->assertRedirect(route('owner.cafes.index'))
            ->assertSessionHasNoErrors();

        $this->assertDatabaseHas('cafes', [
            'owner_id' => $owner->id,
            'name' => 'Kopi Nusantara',
            'city' => 'Jakarta Pusat',
            'approval_status' => 'pending',
        ]);
    }

    public function test_owner_registration_requires_city(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post(route('owner.cafes.store'), [
                'name' => 'Kopi Nusantara',
                'address' => 'Jl. Sudirman No. 1',
            ])
            ->assertSessionHasErrors(['city' => 'Kota wajib diisi.']);

        $this->assertDatabaseCount('cafes', 0);
    }

    public function test_input_is_trimmed_before_it_reaches_the_database(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post(route('owner.cafes.store'), [
                'name' => '  Kopi   Nusantara  ',
                'address' => ' Jl. Sudirman No. 1 ',
                'city' => ' Jakarta  Pusat ',
                'phone' => ' 08123456789 ',
            ])
            ->assertRedirect(route('owner.cafes.index'));

        $this->assertDatabaseHas('cafes', [
            'owner_id' => $owner->id,
            'name' => 'Kopi Nusantara',
            'city' => 'Jakarta Pusat',
        ]);
    }

    public function test_characters_outside_the_whitelist_are_rejected(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post(route('owner.cafes.store'), [
                'name' => '<script>alert(1)</script>',
                'address' => 'Jl. Sudirman No. 1',
                'city' => 'Jakarta Pusat',
            ])
            ->assertSessionHasErrors('name');

        $this->assertDatabaseCount('cafes', 0);
    }

    public function test_overlong_and_too_short_values_are_rejected(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post(route('owner.cafes.store'), [
                'name' => 'AB',
                'address' => 'Jl. Sudirman No. 1',
                'city' => 'Jakarta Pusat',
            ])
            ->assertSessionHasErrors('name');

        $this->actingAs($owner)
            ->post(route('owner.cafes.store'), [
                'name' => 'Kopi Nusantara',
                'address' => str_repeat('a', 256),
                'city' => 'Jakarta Pusat',
            ])
            ->assertSessionHasErrors('address');

        $this->assertDatabaseCount('cafes', 0);
    }

    public function test_whitelist_rejects_markup_in_every_field(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post(route('owner.cafes.store'), [
                'name' => 'Kopi Nusantara',
                'address' => 'Jl. Sudirman No. 1',
                'city' => 'Jakarta Pusat',
                'description' => 'Enak {script}',
            ])
            ->assertSessionHasErrors('description');

        $this->assertDatabaseCount('cafes', 0);
    }

    public function test_non_text_input_is_rejected(): void
    {
        $owner = User::factory()->create(['role' => 'owner']);

        $this->actingAs($owner)
            ->post(route('owner.cafes.store'), [
                'name' => ['array'],
                'address' => 'Jl. Sudirman No. 1',
                'city' => 'Jakarta Pusat',
            ])
            ->assertSessionHasErrors('name');

        $this->assertDatabaseCount('cafes', 0);
    }
}
