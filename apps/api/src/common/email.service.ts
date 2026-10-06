import { Injectable, OnModuleInit } from "@nestjs/common";
import { Resend } from "resend";
import { getConfig } from "@playmate/config";

@Injectable()
export class EmailService implements OnModuleInit {
  private client: Resend;

  onModuleInit() {
    const config = getConfig();
    this.client = new Resend(config.RESEND_API_KEY);
  }

  async sendBookingConfirmation(to: string, bookingDetails: Record<string, unknown>) {
    return this.client.emails.send({
      from: "Playmate <noreply@playmate.in>",
      to,
      subject: "Booking Confirmed!",
      html: `<p>Your booking has been confirmed. Details: <pre>${JSON.stringify(bookingDetails, null, 2)}</pre></p>`,
    });
  }

  async sendOrderConfirmation(to: string, orderDetails: Record<string, unknown>) {
    return this.client.emails.send({
      from: "Playmate <noreply@playmate.in>",
      to,
      subject: "Order Confirmed!",
      html: `<p>Your order has been confirmed. Details: <pre>${JSON.stringify(orderDetails, null, 2)}</pre></p>`,
    });
  }

  async send(to: string, subject: string, html: string) {
    return this.client.emails.send({
      from: "Playmate <noreply@playmate.in>",
      to,
      subject,
      html,
    });
  }
}
