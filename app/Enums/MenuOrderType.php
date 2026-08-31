<?php

declare(strict_types=1);

namespace App\Enums;

enum MenuOrderType: string
{
    case PreOrder = 'pre_order';
    case Additional = 'additional';
}
