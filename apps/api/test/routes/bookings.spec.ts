import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_USER, authBearer } from "../helpers";
import { SupabaseService } from "@/common/supabase.service";
import { BookingsService } from "@/bookings/bookings.service";

const mockGetUser = jest.fn();
const mockCreate = jest.fn();
const mockCancel = jest.fn();
const mockCancellationQuote = jest.fn();

jest.mock("@/bookings/bookings.service", () => ({
  BookingsService: jest.fn().mockImplementation(() => ({ create: mockCreate, cancel: mockCancel, cancellationQuote: mockCancellationQuote })),
}));

describe("Multi-slot booking routes (e2e)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
    (app.get(SupabaseService) as any).admin = { auth: { getUser: mockGetUser } };
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { ...VALID_USER, app_metadata: { role: "USER" } } }, error: null });
    mockCreate.mockResolvedValue({ booking: { id: "booking-1" }, payment: { id: "payment-1" }, razorpayOrder: { id: "order-1" } });
    mockCancel.mockResolvedValue({ id: "booking-1", status: "REFUNDED", refundAmount: 500 });
    mockCancellationQuote.mockResolvedValue({ bookingId: "booking-1", refundAmount: 500, refundPercent: 100 });
  });
  afterAll(async () => app.close());

  it("keeps accepting existing single-slot booking requests", async () => {
    const slotId = "00000000-0000-0000-0000-000000000002";
    const response = await request(app.getHttpServer()).post("/bookings").set(authBearer()).send({ courtSlotId: slotId });
    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(VALID_USER.id, { courtSlotId: slotId });
  });

  it("accepts a multi-slot booking and passes all slot ids to the service", async () => {
    const courtSlotIds = ["00000000-0000-0000-0000-000000000002", "00000000-0000-0000-0000-000000000003"];
    const response = await request(app.getHttpServer()).post("/bookings").set(authBearer()).send({ courtSlotIds });
    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(VALID_USER.id, { courtSlotIds });
  });

  it("rejects repeated slot ids and does not create a booking", async () => {
    const slotId = "00000000-0000-0000-0000-000000000002";
    const response = await request(app.getHttpServer()).post("/bookings").set(authBearer()).send({ courtSlotIds: [slotId, slotId] });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns a cancellation/refund preview to the booking owner", async () => {
    const response = await request(app.getHttpServer()).get("/bookings/booking-1/cancellation-quote").set(authBearer());
    expect(response.status).toBe(200);
    expect(response.body.data.refundPercent).toBe(100);
    expect(mockCancellationQuote).toHaveBeenCalledWith("booking-1", VALID_USER.id);
  });

  it("cancels a booking through the mobile API and returns refund details", async () => {
    const response = await request(app.getHttpServer()).post("/bookings/booking-1/cancel").set(authBearer());
    expect(response.status).toBe(201);
    expect(response.body.data.refundAmount).toBe(500);
    expect(mockCancel).toHaveBeenCalledWith("booking-1", VALID_USER.id);
  });
});
