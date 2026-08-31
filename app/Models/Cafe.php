<?php

declare(strict_types=1);

namespace App\Models;

use App\Enums\CafeApprovalStatus;
use Database\Factories\CafeFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * @property int $id
 * @property int $owner_id
 * @property string $name
 * @property string $slug
 * @property string|null $description
 * @property string $category
 * @property string $address
 * @property string $city
 * @property string|null $postal_code
 * @property string|null $latitude
 * @property string|null $longitude
 * @property array<string, mixed> $facilities
 * @property array<string, mixed> $operational_hours
 * @property array<int, string> $blackout_dates
 * @property string $approval_status
 * @property string|null $rejection_reason
 * @property int $submission_count
 * @property string|null $contact_whatsapp
 * @property string|null $contact_email
 * @property string|null $instagram
 * @property string|null $website
 * @property string|null $reschedule_fee
 * @property \Illuminate\Support\Carbon|null $created_at
 * @property \Illuminate\Support\Carbon|null $updated_at
 * @property \Illuminate\Support\Carbon|null $deleted_at
 * @property-read User|null $owner
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Table> $tables
 * @property-read \Illuminate\Database\Eloquent\Collection<int, MenuItem> $menuItems
 * @property-read \Illuminate\Database\Eloquent\Collection<int, CafePhoto> $photos
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Booking> $bookings
 * @property-read \Illuminate\Database\Eloquent\Collection<int, FeaturedCafe> $featured
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Favorite> $favorites
 */
class Cafe extends Model
{
    /** @use HasFactory<CafeFactory> */
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'owner_id', 'name', 'description', 'category', 'address', 'city',
        'postal_code', 'latitude', 'longitude', 'facilities', 'operational_hours',
        'blackout_dates', 'approval_status', 'rejection_reason', 'submission_count',
        'contact_whatsapp', 'contact_email', 'instagram', 'website', 'reschedule_fee',
    ];

    protected function casts(): array
    {
        return [
            'facilities' => 'array',
            'operational_hours' => 'array',
            'blackout_dates' => 'array',
            'latitude' => 'decimal:7',
            'longitude' => 'decimal:7',
            'submission_count' => 'integer',
            'reschedule_fee' => 'decimal:2',
        ];
    }

    /**
     * @return BelongsTo<User, $this>
     */
    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    /**
     * Normalize stored operational_hours map into a list of entries
     * [{ day, open, close }] for frontend consumption.
     *
     * @return array<int, array{day: string, open: string|null, close: string|null}>
     */
    public function operationalHoursList(): array
    {
        $raw = $this->operational_hours ?? [];

        if (empty($raw)) {
            return [];
        }

        /** @var array<int|string, mixed> $raw */
        $firstKey = array_key_first($raw);
        if ($firstKey !== null && isset($raw[$firstKey]['day'])) {
            // Already normalized format, re-index to ensure integer keys
            return array_values($raw);
        }

        $dayNames = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        $keys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

        $list = [];

        foreach ($keys as $i => $key) {
            if (!isset($raw[$key]) || !is_array($raw[$key])) {
                continue;
            }
            foreach ($raw[$key] as $h) {
                $list[] = [
                    'day' => $dayNames[$i],
                    'open' => $h['open'] ?? null,
                    'close' => $h['close'] ?? null,
                ];
            }
        }

        return $list;
    }

    /**
     * @return HasMany<Table, $this>
     */
    public function tables(): HasMany
    {
        return $this->hasMany(Table::class);
    }

    /**
     * @return HasMany<MenuItem, $this>
     */
    public function menuItems(): HasMany
    {
        return $this->hasMany(MenuItem::class);
    }

    /**
     * @return HasMany<CafePhoto, $this>
     */
    public function photos(): HasMany
    {
        return $this->hasMany(CafePhoto::class);
    }

    /**
     * @return HasMany<Booking, $this>
     */
    public function bookings(): HasMany
    {
        return $this->hasMany(Booking::class);
    }

    /**
     * @return HasMany<FeaturedCafe, $this>
     */
    public function featured(): HasMany
    {
        return $this->hasMany(FeaturedCafe::class);
    }

    /**
     * @return HasMany<Favorite, $this>
     */
    public function favorites(): HasMany
    {
        return $this->hasMany(Favorite::class);
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<static> $query
     * @return \Illuminate\Database\Eloquent\Builder<static>
     */
    public function scopeActive(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('approval_status', 'active');
    }

    /**
     * @param \Illuminate\Database\Eloquent\Builder<static> $query
     * @return \Illuminate\Database\Eloquent\Builder<static>
     */
    public function scopePending(\Illuminate\Database\Eloquent\Builder $query): \Illuminate\Database\Eloquent\Builder
    {
        return $query->where('approval_status', 'pending');
    }

    /**
     * Move the cafe through the approval state machine.
     * Legacy status 'approved' is treated as 'active'.
     */
    public function transitionTo(CafeApprovalStatus $to): void
    {
        $from = CafeApprovalStatus::tryFrom((string) $this->approval_status)
            ?? ($this->approval_status === 'approved' ? CafeApprovalStatus::Active : CafeApprovalStatus::Pending);

        $from->assertCanTransitionTo($to);

        $this->forceFill(['approval_status' => $to->value])->save();
    }

    public function isActive(): bool
    {
        return in_array($this->approval_status, ['active', 'approved'], true);
    }

    /** Content may be edited while active or rejected (fix-then-resubmit flow). */
    public function isContentEditable(): bool
    {
        return in_array($this->approval_status, ['active', 'approved', 'rejected'], true);
    }
}
