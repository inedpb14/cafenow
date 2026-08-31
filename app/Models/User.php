<?php

namespace App\Models;

use App\Enums\UserRole;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Appends;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Fortify\Contracts\PasskeyUser;
use Laravel\Fortify\PasskeyAuthenticatable;
use Laravel\Fortify\TwoFactorAuthenticatable;
use Laravel\Sanctum\HasApiTokens;

/**
 * @property int $id
 * @property string $name
 * @property string|null $full_name
 * @property string $email
 * @property string $password
 * @property UserRole $role
 * @property string|null $phone
 * @property bool $is_phone_verified
 * @property string|null $profile_pic
 * @property \Illuminate\Support\Carbon|null $date_of_birth
 * @property bool $is_suspended
 * @property \Illuminate\Support\Carbon|null $email_verified_at
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property-read string|null $avatar
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Cafe> $cafes
 * @property-read Cafe|null $cafe
 */
#[Appends(['avatar'])]
#[Fillable([
    'name', 'full_name', 'email', 'password', 'role', 'phone',
    'is_phone_verified', 'profile_pic', 'date_of_birth', 'is_suspended',
    'email_verified_at',
])]
#[Hidden([
    'password', 'two_factor_secret', 'two_factor_recovery_codes', 'remember_token',
])]
class User extends Authenticatable implements PasskeyUser
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, PasskeyAuthenticatable, TwoFactorAuthenticatable;

    /**
     * @return HasMany<Cafe, $this>
     */
    public function cafes(): HasMany
    {
        return $this->hasMany(Cafe::class, 'owner_id');
    }

    /**
     * @return HasOne<Cafe, $this>
     */
    public function cafe(): HasOne
    {
        return $this->hasOne(Cafe::class, 'owner_id');
    }

    /**
     * Check if the user has a specific role.
     * Supports both UserRole enum and string comparison.
     */
    public function hasRole(string|UserRole $role): bool
    {
        if ($role instanceof UserRole) {
            return $this->role === $role;
        }

        return $this->role->value === $role;
    }

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'role' => UserRole::class,
            'two_factor_confirmed_at' => 'datetime',
            'is_phone_verified' => 'boolean',
            'is_suspended' => 'boolean',
            'date_of_birth' => 'date',
        ];
    }

    /**
     * @return \Illuminate\Database\Eloquent\Casts\Attribute<string, string>
     */
    protected function avatar(): Attribute
    {
        return Attribute::get(fn () => $this->profile_pic
            ? Storage::url($this->profile_pic)
            : null);
    }
}
