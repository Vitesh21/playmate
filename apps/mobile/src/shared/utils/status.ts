import type { BookingStatus, OrderStatus, PaymentStatus, NotificationType } from '@playmate/types';

export function getBookingStatusVariant(
  status: BookingStatus
): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'CONFIRMED':
    case 'REFUNDED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'EXPIRED':
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}

export function getBookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Awaiting Payment';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'EXPIRED':
      return 'Expired';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

export function getOrderStatusVariant(
  status: OrderStatus
): 'success' | 'warning' | 'error' | 'default' | 'info' {
  switch (status) {
    case 'CONFIRMED':
    case 'SHIPPED':
    case 'DELIVERED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'CANCELLED':
    case 'REFUNDED':
      return 'error';
    default:
      return 'default';
  }
}

export function getOrderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Awaiting Payment';
    case 'CONFIRMED':
      return 'Confirmed';
    case 'SHIPPED':
      return 'Shipped';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

export function getPaymentStatusVariant(
  status: PaymentStatus
): 'success' | 'warning' | 'error' | 'default' {
  switch (status) {
    case 'PAID':
    case 'REFUNDED':
      return 'success';
    case 'PENDING':
      return 'warning';
    case 'FAILED':
      return 'error';
    default:
      return 'default';
  }
}

export function getPaymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case 'PENDING':
      return 'Pending';
    case 'PAID':
      return 'Paid';
    case 'FAILED':
      return 'Failed';
    case 'REFUNDED':
      return 'Refunded';
    default:
      return status;
  }
}

export function getNotificationTypeLabel(type: NotificationType): string {
  switch (type) {
    case 'BOOKING_CONFIRMED':
      return 'Booking Confirmed';
    case 'BOOKING_REMINDER':
      return 'Booking Reminder';
    case 'ORDER_CONFIRMED':
      return 'Order Confirmed';
    case 'ORDER_SHIPPED':
      return 'Order Shipped';
    case 'ORDER_DELIVERED':
      return 'Order Delivered';
    case 'PAYMENT_SUCCESS':
      return 'Payment Success';
    case 'PAYMENT_FAILED':
      return 'Payment Failed';
    case 'GENERAL':
    default:
      return 'Notification';
  }
}
