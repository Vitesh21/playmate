import apiClient from './api';
import type { Booking, Order, Payment, ApiResponse } from '@playmate/types';

const RAZORPAY_KEY = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || '';

type CreateBookingPaymentInput = {
  bookingId: string;
  amount: number;
};

type CreateOrderPaymentInput = {
  orderId: string;
  amount: number;
};

type RazorpayOrderResponse = {
  orderId: string;
  amount: number;
  currency: string;
  receipt: string;
};

class PaymentService {
  async createBookingPayment(input: CreateBookingPaymentInput) {
    return apiClient.post<
      ApiResponse<{ payment: Payment; razorpayOrder: RazorpayOrderResponse }>,
      CreateBookingPaymentInput
    >('/payments/booking', input);
  }

  async createOrderPayment(input: CreateOrderPaymentInput) {
    return apiClient.post<
      ApiResponse<{ payment: Payment; razorpayOrder: RazorpayOrderResponse }>,
      CreateOrderPaymentInput
    >('/payments/order', input);
  }

  async verifyPayment(transactionId: string, paymentId: string) {
    return apiClient.post<
      ApiResponse<{ payment: Payment; booking?: Booking; order?: Order }>,
      { transactionId: string; paymentId: string }
    >('/payments/verify', { transactionId, paymentId });
  }

  getRazorpayKey(): string {
    return RAZORPAY_KEY;
  }
}

export const paymentService = new PaymentService();
export default paymentService;
