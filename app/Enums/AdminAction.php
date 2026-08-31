<?php

declare(strict_types=1);

namespace App\Enums;

enum AdminAction: string
{
    case ApproveCafe = 'approve_cafe';
    case RejectCafe = 'reject_cafe';
    case ProcessRefund = 'process_refund';
    case RejectRefund = 'reject_refund';
    case SuspendUser = 'suspend_user';
    case UnsuspendUser = 'unsuspend_user';
    case UpdateUser = 'update_user';
    case UpdateCommission = 'update_commission';
    case AddFeaturedCafe = 'add_featured_cafe';
    case RemoveFeaturedCafe = 'remove_featured_cafe';
    case UpdateFeaturedCafe = 'update_featured_cafe';
    case CancelBooking = 'cancel_booking';
    case SuspendCafe = 'suspend_cafe';
    case UnsuspendCafe = 'unsuspend_cafe';
}
