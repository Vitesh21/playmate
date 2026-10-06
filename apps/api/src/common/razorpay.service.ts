import { Injectable, OnModuleInit } from "@nestjs/common";
import Razorpay from "razorpay";
import { getConfig } from "@playmate/config";

@Injectable()
export class RazorpayService implements OnModuleInit {
  private client: Razorpay;

  onModuleInit() {
    const config = getConfig();
    this.client = new Razorpay({
      key_id: config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET,
    });
  }

  async createOrder(amount: number, receipt: string) {
    return this.client.orders.create({
      amount,
      currency: "INR",
      receipt,
    });
  }

  async capturePayment(paymentId: string, amount: number) {
    return this.client.payments.capture(paymentId, amount, "INR");
  }

  async verifyPaymentSignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): Promise<boolean> {
    const crypto = await import("crypto");
    const config = getConfig();
    const generated = crypto
      .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest("hex");
    return generated === signature;
  }

  async verifyWebhookSignature(body: string, signature: string): Promise<boolean> {
    const crypto = await import("crypto");
    const config = getConfig();
    const generated = crypto
      .createHmac("sha256", config.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");
    return generated === signature;
  }
}
