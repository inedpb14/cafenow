<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Enums\CafeApprovalStatus;
use App\Exceptions\InvalidCafeStatusTransitionException;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

final class CafeApprovalStatusTest extends TestCase
{
    /**
     * @return array<string, array{string, string}>
     */
    public static function validTransitions(): array
    {
        return [
            'pending to active' => ['pending', 'active'],
            'pending to rejected' => ['pending', 'rejected'],
            'rejected to pending' => ['rejected', 'pending'],
            'active to suspended' => ['active', 'suspended'],
            'suspended to active' => ['suspended', 'active'],
        ];
    }

    #[DataProvider('validTransitions')]
    public function test_valid_transitions_are_allowed(string $from, string $to): void
    {
        $fromStatus = CafeApprovalStatus::from($from);

        $this->assertTrue($fromStatus->canTransitionTo(CafeApprovalStatus::from($to)));
        $fromStatus->assertCanTransitionTo(CafeApprovalStatus::from($to));
        $this->expectNotToPerformAssertions();
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function invalidTransitions(): array
    {
        $cases = [];
        foreach (CafeApprovalStatus::cases() as $from) {
            foreach (CafeApprovalStatus::cases() as $to) {
                if ($from->canTransitionTo($to)) {
                    continue;
                }
                $cases["{$from->value} to {$to->value}"] = [$from->value, $to->value];
            }
        }

        return $cases;
    }

    #[DataProvider('invalidTransitions')]
    public function test_invalid_transitions_throw(string $from, string $to): void
    {
        $fromStatus = CafeApprovalStatus::from($from);

        $this->assertFalse($fromStatus->canTransitionTo(CafeApprovalStatus::from($to)));

        $this->expectException(InvalidCafeStatusTransitionException::class);
        $this->expectExceptionMessage("Transisi status tidak valid: {$from} -> {$to}");

        $fromStatus->assertCanTransitionTo(CafeApprovalStatus::from($to));
    }
}
