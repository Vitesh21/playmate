import { BadRequestException } from "@nestjs/common";
import { calculateCancellationRefund } from "@/bookings/bookings.service";

describe("venue cancellation refunds", () => {
  const policy = { freeCancellationHours: 24, lateRefundPercentage: 50 };

  it("refunds the full amount at or beyond the free-cancellation threshold", () => {
    expect(calculateCancellationRefund(1200, 24, policy)).toMatchObject({ refundPercent: 100, refundAmount: 1200 });
    expect(calculateCancellationRefund(1200, 30, policy)).toMatchObject({ refundPercent: 100, refundAmount: 1200 });
  });

  it("applies the venue late-cancellation refund percentage", () => {
    expect(calculateCancellationRefund(1200, 5, policy)).toMatchObject({ refundPercent: 50, refundAmount: 600 });
  });

  it("defaults to a 24-hour full-refund cutoff and zero late refund", () => {
    expect(calculateCancellationRefund(900, 25)).toMatchObject({ refundPercent: 100, refundAmount: 900 });
    expect(calculateCancellationRefund(900, 3)).toMatchObject({ refundPercent: 0, refundAmount: 0 });
  });

  it("rejects cancellations at or after the session start", () => {
    expect(() => calculateCancellationRefund(900, 0, policy)).toThrow(BadRequestException);
    expect(() => calculateCancellationRefund(900, -1, policy)).toThrow(BadRequestException);
  });
});
