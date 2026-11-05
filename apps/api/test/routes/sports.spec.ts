import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../helpers";
import { SportsService } from "@/sports/sports.service";
import { SupabaseService } from "@/common/supabase.service";
import { VALID_ADMIN, authBearer } from "../helpers";

const mockSearch = jest.fn();
const mockFindBySlug = jest.fn();
const mockFindById = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/sports/sports.service", () => ({
  SportsService: jest.fn().mockImplementation(() => ({
    findAll: mockSearch,
    findBySlug: mockFindBySlug,
    findById: mockFindById,
    create: mockCreate,
    update: mockUpdate,
    remove: mockRemove,
  })),
}));

describe("Sports routes (e2e)", () => {
  let app: INestApplication;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { ...VALID_ADMIN, app_metadata: { role: "ADMIN" } } }, error: null });
  });

  beforeAll(async () => {
    app = await createTestApp();
    (app.get(SupabaseService) as any).admin = { auth: { getUser: mockGetUser } };
  });
  afterAll(async () => app.close());

  const SPORT = {
    id: "s-1",
    name: "Badminton",
    slug: "badminton",
    isActive: true,
  };

  describe("GET /sports", () => {
    it("returns paginated list with success shape", async () => {
      mockSearch.mockResolvedValue({
        items: [SPORT],
        total: 1,
        page: 1,
        limit: 20,
      });
      const res = await request(app.getHttpServer()).get("/sports?page=1&limit=20");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.items[0].slug).toBe("badminton");
    });

    it("applies search query term to the service", async () => {
      mockSearch.mockResolvedValue({ items: [], total: 0 });
      await request(app.getHttpServer()).get("/sports?search=badmin");
      expect(mockSearch).toHaveBeenCalledWith(
        expect.objectContaining({ search: "badmin" }),
      );
    });
  });

  describe("GET /sports/slug/:slug", () => {
    it("resolves a known slug", async () => {
      mockFindBySlug.mockResolvedValue(SPORT);
      const res = await request(app.getHttpServer()).get("/sports/slug/badminton");
      expect(res.status).toBe(200);
      expect(res.body.data.slug).toBe("badminton");
    });
  });

  describe("GET /sports/:id", () => {
    it("returns 200 with record", async () => {
      mockFindById.mockResolvedValue(SPORT);
      const res = await request(app.getHttpServer()).get("/sports/s-1");
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe("s-1");
    });
  });

  describe("POST /sports", () => {
    it("validates via zod: rejects empty name", async () => {
      const res = await request(app.getHttpServer())
        .post("/sports")
        .send({ name: "", slug: "x" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("creates and returns the new record", async () => {
      mockCreate.mockResolvedValue({ ...SPORT, id: "s-new", name: "Tennis", slug: "tennis" });
      const res = await request(app.getHttpServer())
        .post("/sports")
        .set(authBearer(VALID_ADMIN))
        .send({ name: "Tennis", slug: "tennis" });
      expect(res.status).toBe(201);
      expect(res.body.data.name).toBe("Tennis");
    });
  });

  describe("PATCH /sports/:id", () => {
    it("updates and returns updated row", async () => {
      mockUpdate.mockResolvedValue({ ...SPORT, name: "Badminton Pro" });
      const res = await request(app.getHttpServer())
        .patch("/sports/s-1")
        .set(authBearer(VALID_ADMIN))
        .send({ name: "Badminton Pro" });
      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe("Badminton Pro");
    });
  });

  describe("DELETE /sports/:id", () => {
    it("returns success message", async () => {
      mockRemove.mockResolvedValue(undefined);
      const res = await request(app.getHttpServer()).delete("/sports/s-1").set(authBearer(VALID_ADMIN));
      expect(res.status).toBe(200);
      expect(res.body.message).toBe("Sport deleted");
    });
  });
});
