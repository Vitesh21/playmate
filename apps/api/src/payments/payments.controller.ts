git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-AvzSnbSs' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-uRcjnCT9' (errno=Operation not permitted)
import { Body, Controller, Get, Param, Post, Req, Res, UseGuards, Headers } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiHeader } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { AuthGuard } from "@/common/auth.guard";
import { Request, Response } from "express";
import { createZodDto } from "nestjs-zod";
import { z } from "zod";

const verifyPaymentSchema = z.object({
  transactionId: z.string().min(1),
  paymentId: z.string().min(1),
  signature: z.string().min(1).optional(),
});

export class VerifyPaymentDto extends createZodDto(verifyPaymentSchema) {}

@ApiTags("Payments")
@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get("my")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user's payment records" })
  async myPayments(@Req() req: any) {
    const data = await this.paymentsService.findByUser(req.user.id);
    return { success: true, data };
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get payment by ID" })
  @ApiParam({ name: "id", description: "Payment UUID" })
  async findOne(@Param("id") id: string) {
    const data = await this.paymentsService.findById(id);
    return { success: true, data };
  }

  @Get("checkout/:id")
  @ApiOperation({ summary: "Hosted checkout page for mobile / browser payments" })
  @ApiParam({ name: "id", description: "Payment UUID" })
  async checkoutPage(@Param("id") id: string, @Res() res: Response) {
    const data = await this.paymentsService.getHostedCheckoutData(id);

    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${data.checkoutTitle}</title>
    <style>
      body { font-family: Arial, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; }
      .wrap { max-width:420px; margin:0 auto; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px; }
      .card { width:100%; background:#111827; border:1px solid #334155; border-radius:16px; padding:24px; box-sizing:border-box; }
      h1 { margin:0 0 8px; font-size:24px; }
      p { color:#cbd5e1; line-height:1.5; }
      .amount { font-size:28px; font-weight:700; margin:16px 0 8px; }
      button { width:100%; border:0; border-radius:12px; padding:14px 16px; font-size:16px; font-weight:700; cursor:pointer; background:#10b981; color:#06281d; }
      button.secondary { margin-top:12px; background:#38bdf8; color:#082f49; }
      .status { margin-top:16px; padding:12px; border-radius:12px; background:#0b1220; border:1px solid #334155; white-space:pre-wrap; }
    </style>
    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <h1>${data.checkoutTitle}</h1>
        <p>${data.checkoutDescription}</p>
        <div class="amount">Rs. ${data.payment.amount}</div>
        <button id="pay-btn">${data.isMockCheckout ? "Simulate Test Payment" : "Pay with Razorpay"}</button>
        ${data.isMockCheckout ? '<button id="confirm-btn" class="secondary">Mark Test Booking Paid</button>' : ""}
        <div id="status" class="status">Waiting for payment...</div>
      </div>
    </div>
    <script>
      const statusEl = document.getElementById("status");
      const payBtn = document.getElementById("pay-btn");
      const confirmBtn = document.getElementById("confirm-btn");
      const verifyPayload = async (payload) => {
        statusEl.textContent = "Verifying payment...";
        const res = await fetch("/payments/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || json.error?.message || "Verification failed");
        }
        statusEl.textContent = "Payment confirmed. You can return to Expo Go now.";
      };

      const startMockFlow = async () => {
        await verifyPayload({
          transactionId: ${JSON.stringify(data.orderId)},
          paymentId: "pay_mock_" + Date.now(),
        });
      };

      payBtn?.addEventListener("click", async () => {
        try {
          if (${data.isMockCheckout ? "true" : "false"}) {
            await startMockFlow();
            return;
          }

          const options = {
            key: ${JSON.stringify(data.keyId)},
            amount: ${JSON.stringify(data.amountInPaise)},
            currency: "INR",
            name: ${JSON.stringify(data.checkoutTitle)},
            description: ${JSON.stringify(data.checkoutDescription)},
            order_id: ${JSON.stringify(data.orderId)},
            handler: async function (response) {
              await verifyPayload({
                transactionId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              });
            },
            modal: {
              ondismiss: function () {
                statusEl.textContent = "Payment window closed. The booking stays on hold until it expires.";
              }
            },
            theme: { color: "#10b981" }
          };

          const razorpay = new window.Razorpay(options);
          razorpay.on("payment.failed", function (response) {
            statusEl.textContent = "Payment failed: " + (response.error?.description || "Try again.");
          });
          razorpay.open();
          statusEl.textContent = "Checkout opened...";
        } catch (error) {
          statusEl.textContent = error.message || "Unable to start payment.";
        }
      });

      confirmBtn?.addEventListener("click", async () => {
        try {
          await startMockFlow();
        } catch (error) {
          statusEl.textContent = error.message || "Unable to mark payment as paid.";
        }
      });
    </script>
  </body>
</html>`;

    return res.status(200).type("html").send(html);
  }

  @Post("verify")
  @ApiOperation({ summary: "Verify a payment and confirm the linked booking / order" })
  async verify(@Body() body: VerifyPaymentDto) {
    const data = await this.paymentsService.verifyPayment(verifyPaymentSchema.parse(body));
    return { success: true, data };
  }

  @Post("razorpay/webhook")
  @ApiOperation({ summary: "Razorpay server webhook notification" })
  @ApiHeader({ name: "x-razorpay-signature", description: "HMAC hex signature" })
  async razorpayWebhook(
    @Req() req: Request,
    @Headers("x-razorpay-signature") signature: string,
    @Res() res: Response,
  ) {
    try {
      const rawBody = (req as any).rawBody as Buffer | undefined;
      if (!rawBody) {
        return res.status(400).json({ success: false, error: "Raw webhook body is unavailable" });
      }
      const result = await this.paymentsService.handleRazorpayWebhook(
        rawBody,
        signature ?? "",
        req.body,
      );
      return res.status(200).json({ success: true, ...(result as any) });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }
}
