import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_VENUE_OWNER, authBearer } from "../helpers";
import { VenuesService } from "@/venues/venues.service";
import { SupabaseService } from "@/common/supabase.service";

const mockSearch = jest.fn();
const mockFindBySlug = jest.fn();
const mockFindById = jest.fn();
const mockGetCourts = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/venues/venues.service", () => ({
  VenuesService: jest.fn().mockImplementation(() => ({
    search: mockSearch,
    findBySlug: mockFindBySlug,
    findById: mockFindById,
    getCourts: mockGetCourts,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
  })),
}));

describe("Venues routes (e2e)", () => {
  let app: INestApplication;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { ...VALID_VENUE_OWNER, app_metadata: { role: "VENUE_OWNER" } } }, error: null });
  });

  beforeAll(async () => {
    app = await createTestApp();
    const sb = app.get(SupabaseService);
    (sb as any).admin = { auth: { getUser: mockGetUser } };
  });
  afterAll(async () => app.close());

  const VENUE = {
    id: "v-1",
    name: "Downtown Badminton",
    slug: "downtown-badminton",
    city: "Bengaluru",
    isActive: true,
  };
  const COURTS = [
    { id: "c-1", name: "Court 1", venueId: "v-1" },
    { id: "c-2", name: "Court 2", venueId: "v-1" },
  ];

  describe("GET /venues", () => {
    it("accepts pagination + filter params and returns list", async () => {
      mockSearch.mockResolvedValue({ items: [VENUE], total: 1, page: 1, limit: 10 });
      const res = await request(app.getHttpServer())
        .get("/venues?city=Bengaluru&sportId=sp-1&page=1&limit=10");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ city: "Bengaluru", sportId: "sp-1" }),
      );
    });

    it("accepts availability, amenity, court, rating and distance filters", async () => {
      mockSearch.mockResolvedValue({ items: [], total: 0, page: 1, perPage: 10, totalPages: 0 });
      const res = await request(app.getHttpServer()).get(
        "/venues?date=2026-11-08&startTime=18%3A00&endTime=19%3A00&amenities=Parking%2CLights&courtType=INDOOR&surface=wood&minRating=4&latitude=12.97&longitude=77.59&radiusKm=15&minPrice=200&maxPrice=800",
      );
      expect(res.status).toBe(200);
      expect(mockSearch).toHaveBeenCalledWith(expect.objectContaining({
        date: "2026-11-08",
        startTime: "18:00",
        endTime: "19:00",
        amenities: "Parking,Lights",
        courtType: "INDOOR",
        surface: "wood",
        minRating: 4,
        latitude: 12.97,
        longitude: 77.59,
        radiusKm: 15,
        minPrice: 200,
        maxPrice: 800,
      }));
    });

    it("rejects coordinates outside the valid latitude and longitude ranges", async () => {
      const res = await request(app.getHttpServer()).get("/venues?latitude=120&longitude=77");
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(mockSearch).not.toHaveBeenCalled();
    });
  });

  describe("GET /venues/slug/:slug", () => {
    it("returns venue by slug", async () => {
      mockFindBySlug.mockResolvedValue(VENUE);
      const res = await request(app.getHttpServer()).get("/venues/slug/downtown-badminton");
      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe("downtown-badminton");
    });
  });

  describe("GET /venues/:id", () => {
    it("returns venue by id", async () => {
      mockFindById.mockResolvedValue(VENUE);
      const res = await request(app.getHttpServer()).get("/venues/v-1");
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("v-1");
    });
  });

  describe("GET /venues/:id/courts", () => {
    it("returns court children", async () => {
      mockGetCourts.mockResolvedValue(COURTS);
      const res = await request(app.getHttpServer()).get("/venues/v-1/courts");
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].name).toBe("Court 1");
    });
  });

  describe("POST /venues", () => {
    it("rejects invalid venue create payload via Zod", async () => {
      const res = await request(app.getHttpServer())
        .post("/venues")
        .send({ name: "", slug: "x" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("rejects Zod uuid-typed venueId inside payload with wrong format", async () => {
      const res = await request(app.getHttpServer())
        .post("/venues")
        .send({ name: "V", slug: "v", sportId: "not-a-uuid" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("accepts a well-formed venue create payload", async () => {
      mockCreate.mockResolvedValue({ ...VENUE, id: "v-new" });
      const payload = {
        name: "New Venue",
        slug: "new-venue",
        sportId: "00000000-0000-0000-0000-000000000001",
        address: "123 street",
        city: "Bengaluru",
        state: "KA",
        pincode: "560001",
      };
      const res = await request(app.getHttpServer()).post("/venues").set(authBearer(VALID_VENUE_OWNER)).send(payload);
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });
  });
});
