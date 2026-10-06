/**
 * Email Service — Transactional email via Resend.
 *
 * Thin wrapper around the Resend SDK (resend.com). Provides typed helper
 * wrappers for the two most common transactional emails in the app
 * (booking confirmation and order confirmation) plus a generic `send()`
 * escape hatch for one-off / ad-hoc templates.
 *
 * All emails come from a single verified sender:
 *   "Playmate <noreply@playmate.in>"
 * The `playmate.in` domain must be verified in the Resend dashboard or
 * delivery will fail.
 */

import { Injectable, OnModuleInit } from "@nestjs/common";
import { Resend } from "resend";
import { getConfig } from "@playmate/config";

@Injectable()
export class EmailService implements OnModuleInit {
  /** Underlying Resend SDK client. Private to keep the API key inside this class. */
  private client: Resend;

  /**
   * Nest lifecycle hook: create the Resend client using the bearer API key
   * from environment config. The key starts with "re_..." (Resend format).
   */
  onModuleInit() {
    const config = getConfig();
    this.client = new Resend(config.RESEND_API_KEY);
  }

  /**
   * Send a BOOKING CONFIRMATION email after a court booking is successfully
   * paid and moved to CONFIRMED status.
   *
   * @param to              — Recipient email address (user.email from Supabase Auth).
   * @param bookingDetails  — Arbitrary booking metadata object; rendered in the
   *                          email as a <pre>-wrapped JSON block for debugging /
   *                          quick reference. In production this would be swapped
   *                          for a React Email / MJML template.
   */
  async sendBookingConfirmation(to: string, bookingDetails: Record<string, unknown>) {
    return this.client.emails.send({
      from: "Playmate <noreply@playmate.in>",
      to,
      subject: "Booking Confirmed!",
      html: `<p>Your booking has been confirmed. Details: <pre>${JSON.stringify(bookingDetails, null, 2)}</pre></p>`,
    });
  }

  /**
   * Send an ORDER CONFIRMATION email after e-commerce checkout is paid and
   * the order moves to CONFIRMED status.
   *
   * @param to            — Recipient email address.
   * @param orderDetails  — Arbitrary order metadata object. Same rendering note
   *                        as sendBookingConfirmation: JSON <pre> block today,
   *                        replace with a proper template for launch.
   */
  async sendOrderConfirmation(to: string, orderDetails: Record<string, unknown>) {
    return this.client.emails.send({
      from: "Playmate <noreply@playmate.in>",
      to,
      subject: "Order Confirmed!",
      html: `<p>Your order has been confirmed. Details: <pre>${JSON.stringify(orderDetails, null, 2)}</pre></p>`,
    });
  }

  /**
   * Generic, fully-customizable send helper. Use this when the two wrapper
   * helpers above don't fit (e.g. password reset, OTP, marketing drips).
   *
   * @param to      — Recipient email (string; Resend also accepts arrays).
   * @param subject — Email subject line.
   * @param html    — Full HTML body string. Resend also supports `text` for
   *                  plain-text fallback; not exposed here since current
   *                  callers only send HTML.
   */
  async send(to: string, subject: string, html: string) {
    return this.client.emails.send({
      from: "Playmate <noreply@playmate.in>",
      to,
      subject,
      html,
    });
  }
}
