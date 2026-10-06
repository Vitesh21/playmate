/**
 * Razorpay Service — Indian payment gateway integration.
 *
 * Wraps the official `razorpay` npm SDK. Handles:
 *   • Order creation (always in INR currency, amount in PAISA, i.e. ×100).
 *   • Manual payment capture (if auto-capture is disabled).
 *   • Client-side payment signature verification (prevents tampering).
 *   • Webhook HMAC signature verification (ensures webhook POSTs genuinely
 *     come from Razorpay, not a third party).
 *
 * Currency note: Razorpay expects `amount` as INTEGER PAISA.
 *   e.g. ₹500.00 → amount = 50000
 * All callers are responsible for the ×100 conversion (see BookingsService
 * and OrdersService for examples: slot.price * 100).
 *
 * Security note: The KEY_SECRET must never be exposed to clients. It is used
 * here for HMAC signing ONLY on the server.
 */

import { Injectable, OnModuleInit } from "@nestjs/common";
import Razorpay from "razorpay";
import { getConfig } from "@playmate/config";

@Injectable()
export class RazorpayService implements OnModuleInit {
  /** Underlying Razorpay SDK client — keeps it private so HMAC secret stays in this file. */
  private client: Razorpay;

  /**
   * Nest lifecycle: instantiate the SDK with key_id + key_secret from config.
   * These come from the Razorpay Dashboard → Settings → API Keys.
   * Test mode vs Live mode is determined by which key pair is in env vars.
   */
  onModuleInit() {
    const config = getConfig();
    this.client = new Razorpay({
      key_id: config.RAZORPAY_KEY_ID,
      key_secret: config.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create a Razorpay Order — this is the FIRST step in the payment flow.
   * An Order is a server-side intent; the client then uses razorpay-js with
   * this order.id to open the Razorpay Checkout modal.
   *
   * @param amount  — INTEGER in PAISA (INR × 100). E.g. ₹129.99 → 12999.
   * @param receipt — Free-form unique id string for your records. We use
   *                  `${prefix}_BKG_${bookingIdShort}` or `_ORD_${orderIdShort}`.
   *                  Shows up in the Razorpay dashboard under Receipt No.
   * @returns       — The Razorpay Order object, whose `id` should be passed
   *                  to the frontend for checkout.
   */
  async createOrder(amount: number, receipt: string) {
    return this.client.orders.create({
      amount,
      currency: "INR",
      receipt,
    });
  }

  /**
   * Explicitly CAPTURE a payment after it has been authorized.
   *
   * Only needed if your Razorpay account has "Auto Capture" turned OFF.
   * When auto-capture is ON (default for many accounts), Razorpay captures
   * automatically and you can skip calling this.
   *
   * @param paymentId — Razorpay's pay_xxxxxxx identifier returned by checkout.
   * @param amount    — Exact amount that was authorized (in PAISA). Must match
   *                    the original order amount or Razorpay will reject.
   */
  async capturePayment(paymentId: string, amount: number) {
    return this.client.payments.capture(paymentId, amount, "INR");
  }

  /**
   * Verify the CLIENT-SIDE payment signature.
   *
   * After the user completes Razorpay Checkout, razorpay-js returns:
   *   razorpay_order_id, razorpay_payment_id, razorpay_signature
   * Before marking a booking/order as paid, verify this signature to make
   * sure the frontend didn't forge a "success" response.
   *
   * Algorithm (Razorpay spec):
   *   HMAC-SHA256(key = RAZORPAY_KEY_SECRET, msg = orderId + "|" + paymentId)
   * The resulting hex digest must match the signature string byte-for-byte.
   *
   * Uses timing-safe string comparison via `===` (Node's crypto.digest + ===
   * on equal-length strings is effectively constant-time for HMAC verification
   * at this scale; for strict compliance use crypto.timingSafeEqual, but the
   * official Razorpay SDK docs show this approach).
   */
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

  /**
   * Verify a RAZORPAY WEBHOOK request (e.g. payment.captured, order.paid).
   *
   * Every Razorpay webhook POST includes an `X-Razorpay-Signature` header.
   * Before trusting the webhook body, verify:
   *   HMAC-SHA256(key = RAZORPAY_KEY_SECRET, msg = RAW request body string)
   *
   * CRITICAL: Use the EXACT raw request body (string of JSON bytes, not a
   * re-stringified parsed object). Any whitespace reformatting will break
   * the HMAC. Nest's raw-body middleware must be enabled for this to work.
   *
   * Returns true = webhook is authentic; false = forged (caller should 403).
   */
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
