import { Body, Controller, Get, Param, Post, Req, Res, UseGuards, Headers } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiHeader } from "@nestjs/swagger";
import { PaymentsService } from "./payments.service";
import { AuthGuard } from "@/common/auth.guard";
import { Request, Response } from "express";

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

  @Post("razorpay/webhook")
  @ApiOperation({ summary: "Razorpay server webhook notification" })
  @ApiHeader({ name: "x-razorpay-signature", description: "HMAC hex signature" })
  async razorpayWebhook(
    @Req() req: Request,
    @Headers("x-razorpay-signature") signature: string,
    @Res() res: Response,
  ) {
    try {
      const rawBody = (req as any).rawBody ?? JSON.stringify(req.body);
      const result = await this.paymentsService.handleRazorpayWebhook(
        typeof rawBody === "string" ? rawBody : JSON.stringify(rawBody),
        signature ?? "",
        req.body,
      );
      return res.status(200).json({ success: true, ...(result as any) });
    } catch (error: any) {
      return res.status(400).json({ success: false, error: error.message });
    }
  }
}

