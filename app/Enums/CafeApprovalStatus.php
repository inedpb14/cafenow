<?php

declare(strict_types=1);

namespace App\Enums;

use App\Exceptions\InvalidCafeStatusTransitionException;

enum CafeApprovalStatus: string
{
    case Pending = 'pending';
    case Active = 'active';
    case Suspended = 'suspended';
    case Rejected = 'rejected';

    /** Allowed transitions, keyed by current status. */
    private const TRANSITIONS = [
        'pending' => ['active', 'rejected'],
        'rejected' => ['pending'],
        'active' => ['suspended'],
        'suspended' => ['active'],
    ];

    public function canTransitionTo(self $to): bool
    {
        return in_array($to->value, self::TRANSITIONS[$this->value], true);
    }

    public function assertCanTransitionTo(self $to): void
    {
        if (! $this->canTransitionTo($to)) {
            throw new InvalidCafeStatusTransitionException(
                "Transisi status tidak valid: {$this->value} -> {$to->value}"
            );
        }
    }
}
