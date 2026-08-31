<?php

declare(strict_types=1);

namespace App\Enums;

enum NotificationType: string
{
    case BookingConfirmed = 'booking_confirmed';
    case BookingCancelled = 'booking_cancelled';
    case BookingCancelledByOwner = 'booking_cancelled_by_owner';
    case BookingReminder2h = 'booking_reminder_2h';
    case BookingReminder30m = 'booking_reminder_30m';
    case BookingRescheduled = 'booking_rescheduled';
    case BookingCheckIn = 'booking_check_in';
    case PaymentReceived = 'payment_received';
    case BookingExtended = 'booking_extended';
    case OrderPlaced = 'order_placed';
    case OrderConfirmed = 'order_confirmed';
    case OrderStatusUpdated = 'order_status_updated';
    case RefundProcessed = 'refund_processed';
    case RefundRejected = 'refund_rejected';
    case NewBookingAlert = 'new_booking_alert';
    case NewOrderAlert = 'new_order_alert';
    case DailySummary = 'daily_summary';
    case LateWebhookRefund = 'late_webhook_refund';
    case CafeApproved = 'cafe_approved';
    case CafeRejected = 'cafe_rejected';
    case BookingCancelledBySystem = 'booking_cancelled_by_system';
}
