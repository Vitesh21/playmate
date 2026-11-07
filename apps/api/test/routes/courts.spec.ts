import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_VENUE_OWNER, authBearer } from "../helpers";
import { CourtsService } from "@/courts/courts.service";
import { SupabaseService } from "@/common/supabase.service";

const mockSetAvailability = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/courts/courts.service", () => ({
  CourtsService: jest.fn().mockImplementation(() => ({ setSlotAvailability: mockSetAvailability })),
}));

describe("Court slot availability routes (e2e)", () => {
  let app: INestApplication;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { ...VALID_VENUE_OWNER, app_metadata: { role: "VENUE_OWNER" } } }, error: null });
  });

  beforeAll(async () => {
    app = await createTestApp();
    const supabase = app.get(SupabaseService);
    (supabase as any).admin = { auth: { getUser: mockGetUser } };
  });
  afterAll(async () => app.close());

  it("requires authentication to block a slot", async () => {
    const response = await request(app.getHttpServer()).patch("/courts/court-1/slots/slot-1/availability").send({ isAvailable: false });
    expect(response.status).toBe(401);
    expect(mockSetAvailability).not.toHaveBeenCalled();
  });

  it("validates and forwards an owner slot availability change", async () => {
    mockSetAvailability.mockResolvedValue({ id: "slot-1", isAvailable: false });
    const response = await request(app.getHttpServer())
      .patch("/courts/court-1/slots/slot-1/availability")
      .set(authBearer(VALID_VENUE_OWNER))
      .send({ isAvailable: false });
    expect(response.status).toBe(200);
    expect(response.body.data.isAvailable).toBe(false);
    expect(mockSetAvailability).toHaveBeenCalledWith("court-1", "slot-1", false, VALID_VENUE_OWNER.id, "VENUE_OWNER");
  });

  it("rejects malformed availability updates", async () => {
    const response = await request(app.getHttpServer())
      .patch("/courts/court-1/slots/slot-1/availability")
      .set(authBearer(VALID_VENUE_OWNER))
      .send({ isAvailable: "false" });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockSetAvailability).not.toHaveBeenCalled();
  });
});
