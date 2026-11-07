import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_USER, authBearer } from "../helpers";
import { SupabaseService } from "@/common/supabase.service";
import { BookingsService } from "@/bookings/bookings.service";

const mockGetUser = jest.fn();
const mockCreate = jest.fn();

jest.mock("@/bookings/bookings.service", () => ({
  BookingsService: jest.fn().mockImplementation(() => ({ create: mockCreate })),
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
});
