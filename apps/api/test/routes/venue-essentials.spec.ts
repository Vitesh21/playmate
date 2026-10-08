import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import {
  createTestApp,
  VALID_USER,
  VALID_VENUE_OWNER,
  VALID_ADMIN,
  authBearer,
} from "../helpers";
import { VenueEssentialsService } from "@/venue-essentials/venue-essentials.service";
import { SupabaseService } from "@/common/supabase.service";

const mockSearch = jest.fn();
const mockFindById = jest.fn();
const mockFindRecommendations = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockGetBookingEssentials = jest.fn();
const mockAttachEssentialsToBooking = jest.fn();
const mockCreateOnDemandOrder = jest.fn();
const mockListOnDemandOrders = jest.fn();
const mockUpdateOnDemandStatus = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/venue-essentials/venue-essentials.service", () => ({
  VenueEssentialsService: jest.fn().mockImplementation(() => ({
    search: mockSearch,
    findById: mockFindById,
    findRecommendations: mockFindRecommendations,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
    getBookingEssentials: mockGetBookingEssentials,
    attachEssentialsToBooking: mockAttachEssentialsToBooking,
    createOnDemandOrder: mockCreateOnDemandOrder,
    listOnDemandOrders: mockListOnDemandOrders,
    updateOnDemandStatus: mockUpdateOnDemandStatus,
  })),
}));

const VENUE_ID = "00000000-0000-0000-0000-0000000000a1";
const SPORT_ID = "00000000-0000-0000-0000-0000000000b1";
const ESSENTIAL = {
  id: "e-1",
  venueId: VENUE_ID,
  sportId: SPORT_ID,
  name: "Yonex Racket",
  type: "RENT",
  pricingModel: "PER_HOUR",
  price: 150,
  stockQuantity: 10,
  maxPerBooking: 2,
  isActive: true,
};

describe("Venue Essentials routes (e2e)", () => {
  let app: INestApplication;

  beforeEach(() => jest.clearAllMocks());

  beforeAll(async () => {
    app = await createTestApp();
    const sb = app.get(SupabaseService);
    (sb as any).admin = { auth: { getUser: mockGetUser } };
  });
  afterAll(async () => app.close());

  // ---------- Catalog ----------

  describe("GET /venue-essentials (public)", () => {
    it("returns filtered essentials list", async () => {
      mockSearch.mockResolvedValue([ESSENTIAL]);
      const res = await request(app.getHttpServer())
        .get(`/venue-essentials?venueId=${VENUE_ID}&sportId=${SPORT_ID}&type=RENT&page=1&limit=10`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].name).toBe("Yonex Racket");
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ venueId: VENUE_ID, type: "RENT" }),
      );
    });

    it("rejects Zod-typed enum violations (type = BOGUS)", async () => {
      const res = await request(app.getHttpServer())
        .get(`/venue-essentials?venueId=${VENUE_ID}&type=BOGUS`);
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("GET /venue-essentials/recommendations", () => {
    it("returns weighted recommendations sorted by tag", async () => {
      mockFindRecommendations.mockResolvedValue([
        { ...ESSENTIAL, recommendation: "Most booked" },
        { ...ESSENTIAL, id: "e-2", recommendation: "Beginners' pick" },
      ]);
      const res = await request(app.getHttpServer())
        .get(`/venue-essentials/recommendations?venueId=${VENUE_ID}&sportId=${SPORT_ID}&limit=4`);
      expect(res.status).toBe(200);
      expect(res.body.data[0].recommendation).toBe("Most booked");
      expect(mockFindRecommendations).toHaveBeenCalledWith(VENUE_ID, SPORT_ID, 4);
    });
  });

  describe("GET /venue-essentials/:id", () => {
    it("returns a single essential", async () => {
      mockFindById.mockResolvedValue(ESSENTIAL);
      const res = await request(app.getHttpServer()).get("/venue-essentials/e-1");
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("e-1");
    });
  });

  // ---------- Catalog writes (RBAC) ----------

  describe("POST /venue-essentials (VENUE_OWNER / ADMIN)", () => {
    it("rejects anonymous (401)", async () => {
      const res = await request(app.getHttpServer())
        .post("/venue-essentials")
        .send({ venueId: VENUE_ID, sportId: SPORT_ID, name: "X" });
      expect(res.status).toBe(401);
    });

    it("rejects plain USER role (401 via RolesGuard)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      const res = await request(app.getHttpServer())
        .post("/venue-essentials")
        .set(authBearer(VALID_USER))
        .send({ venueId: VENUE_ID, sportId: SPORT_ID, name: "X" });
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/Insufficient permissions/);
    });

    it("rejects Zod-invalid payload from VENUE_OWNER (negative price, no name)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_VENUE_OWNER }, error: null });
      const res = await request(app.getHttpServer())
        .post("/venue-essentials")
        .set(authBearer(VALID_VENUE_OWNER))
        .send({ venueId: VENUE_ID, sportId: SPORT_ID, price: -1, type: "RENT", pricingModel: "PER_HOUR" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("accepts valid payload from ADMIN", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_ADMIN }, error: null });
      mockCreate.mockResolvedValue({ ...ESSENTIAL, id: "e-new" });
      const res = await request(app.getHttpServer())
        .post("/venue-essentials")
        .set(authBearer(VALID_ADMIN))
        .send({
          venueId: VENUE_ID,
          sportId: SPORT_ID,
          name: "Yonex Racket",
          type: "RENT",
          pricingModel: "PER_HOUR",
          price: 150,
          stockQuantity: 5,
          maxPerBooking: 2,
          tags: ["Most booked"],
          categories: ["Rackets"],
        });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe("e-new");
    });
  });

  describe("PATCH /venue-essentials/:id + DELETE", () => {
    it("401 for anonymous update", async () => {
      const res = await request(app.getHttpServer())
        .patch("/venue-essentials/e-1")
        .send({ price: 200 });
      expect(res.status).toBe(401);
    });

    it("401 for anonymous delete", async () => {
      const res = await request(app.getHttpServer()).delete("/venue-essentials/e-1");
      expect(res.status).toBe(401);
    });

    it("ADMIN can soft-delete (archive)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_ADMIN }, error: null });
      mockRemove.mockResolvedValue(undefined);
      const res = await request(app.getHttpServer())
        .delete("/venue-essentials/e-1")
        .set(authBearer(VALID_ADMIN));
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Venue essential archived");
    });
  });

  // ---------- Booking attach ----------

  describe("POST /venue-essentials/bookings/:id/attach (authenticated)", () => {
    const BOOKING_ID = "00000000-0000-0000-0000-0000000000c1";

    it("401 without auth", async () => {
      const res = await request(app.getHttpServer())
        .post(`/venue-essentials/bookings/${BOOKING_ID}/attach`)
        .send({ items: [] });
      expect(res.status).toBe(401);
    });

    it("Zod rejects empty items array", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      const res = await request(app.getHttpServer())
        .post(`/venue-essentials/bookings/${BOOKING_ID}/attach`)
        .set(authBearer(VALID_USER))
        .send({ items: [] });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("Zod rejects quantity = 0", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      const res = await request(app.getHttpServer())
        .post(`/venue-essentials/bookings/${BOOKING_ID}/attach`)
        .set(authBearer(VALID_USER))
        .send({
          items: [{ venueEssentialId: "e-1", quantity: 0 }],
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("Zod rejects non-uuid venueEssentialId", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      const res = await request(app.getHttpServer())
        .post(`/venue-essentials/bookings/${BOOKING_ID}/attach`)
        .set(authBearer(VALID_USER))
        .send({
          items: [{ venueEssentialId: "not-uuid", quantity: 1 }],
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("Service bubbles maxPerBooking violation as 500/4xx (invariant enforced inside service tx)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      mockAttachEssentialsToBooking.mockRejectedValue(
        new Error("Quantity 3 > maxPerBooking 2 for Yonex Racket"),
      );
      const res = await request(app.getHttpServer())
        .post(`/venue-essentials/bookings/${BOOKING_ID}/attach`)
        .set(authBearer(VALID_USER))
        .send({
          items: [
            { venueEssentialId: ESSENTIAL.id, quantity: 3 },
          ],
        });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.text).toMatch(/maxPerBooking/);
    });

    it("happy path — valid attach returns inserted rows", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      mockAttachEssentialsToBooking.mockResolvedValue([
        { id: "be-1", bookingId: BOOKING_ID, venueEssentialId: ESSENTIAL.id, quantity: 2 },
      ]);
      const res = await request(app.getHttpServer())
        .post(`/venue-essentials/bookings/${BOOKING_ID}/attach`)
        .set(authBearer(VALID_USER))
        .send({
          items: [
            { venueEssentialId: ESSENTIAL.id, quantity: 2, durationHours: 2 },
          ],
        });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].quantity).toBe(2);
    });
  });

  describe("GET /venue-essentials/bookings/:bookingId (auth)", () => {
    it("returns rows for authenticated user", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      mockGetBookingEssentials.mockResolvedValue([
        { id: "be-1", nameSnapshot: "Racket" },
      ]);
      const res = await request(app.getHttpServer())
        .get(`/venue-essentials/bookings/00000000-0000-0000-0000-0000000000c1`)
        .set(authBearer(VALID_USER));
      expect(res.status).toBe(200);
      expect(res.body.data[0].nameSnapshot).toBe("Racket");
    });
  });

  // ---------- On-demand orders ----------

  describe("POST /venue-essentials/on-demand", () => {
    it("401 anonymous", async () => {
      const res = await request(app.getHttpServer())
        .post("/venue-essentials/on-demand")
        .send({ items: [] });
      expect(res.status).toBe(401);
    });

    it("Zod rejects missing items", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      const res = await request(app.getHttpServer())
        .post("/venue-essentials/on-demand")
        .set(authBearer(VALID_USER))
        .send({});
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("happy path — creates order with totalAmount = sum of items", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      mockCreateOnDemandOrder.mockResolvedValue({
        id: "odo-1",
        userId: VALID_USER.id,
        status: "PENDING",
        totalAmount: 300,
        items: [
          { venueEssentialId: ESSENTIAL.id, quantity: 2, totalPriceSnapshot: 300 },
        ],
      });
      const res = await request(app.getHttpServer())
        .post("/venue-essentials/on-demand")
        .set(authBearer(VALID_USER))
        .send({
          bookingId: "00000000-0000-0000-0000-0000000000c1",
          items: [{ venueEssentialId: ESSENTIAL.id, quantity: 2 }],
          courtNumber: "C-1",
          deliveryNote: "Please leave at court",
        });
      expect(res.status).toBe(201);
      expect(res.body.data.totalAmount).toBe(300);
    });
  });

  describe("PATCH /venue-essentials/on-demand/:id/status", () => {
    it("rejects USER role (only VENUE_OWNER / ADMIN)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_USER }, error: null });
      const res = await request(app.getHttpServer())
        .patch("/venue-essentials/on-demand/odo-1/status")
        .set(authBearer(VALID_USER))
        .send({ status: "DELIVERED" });
      expect(res.status).toBe(401);
    });

    it("Zod rejects invalid status value", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_VENUE_OWNER }, error: null });
      const res = await request(app.getHttpServer())
        .patch("/venue-essentials/on-demand/odo-1/status")
        .set(authBearer(VALID_VENUE_OWNER))
        .send({ status: "DONE" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("ADMIN can transition to DELIVERED", async () => {
      mockGetUser.mockResolvedValue({ data: { user: VALID_ADMIN }, error: null });
      mockUpdateOnDemandStatus.mockResolvedValue({ id: "odo-1", status: "DELIVERED" });
      const res = await request(app.getHttpServer())
        .patch("/venue-essentials/on-demand/odo-1/status")
        .set(authBearer(VALID_ADMIN))
        .send({ status: "DELIVERED" });
      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe("DELIVERED");
    });
  });
});
