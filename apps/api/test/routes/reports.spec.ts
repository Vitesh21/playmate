import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_ADMIN, VALID_USER, authBearer } from "../helpers";
import { SupabaseService } from "@/common/supabase.service";
import { ReportsService } from "@/reports/reports.service";

const mockGetUser = jest.fn();
const mockCreate = jest.fn();
const mockListOpen = jest.fn();
const mockResolve = jest.fn();

jest.mock("@/reports/reports.service", () => ({
  ReportsService: jest.fn().mockImplementation(() => ({
    create: mockCreate,
    listOpen: mockListOpen,
    resolve: mockResolve,
  })),
}));

describe("Reports routes (e2e)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
    (app.get(SupabaseService) as any).admin = { auth: { getUser: mockGetUser } };
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockImplementation(async (token: string) => ({
      data: { user: token.includes("admin") ? { ...VALID_ADMIN, app_metadata: { role: "ADMIN" } } : { ...VALID_USER, app_metadata: { role: "USER" } } },
      error: null,
    }));
  });
  afterAll(async () => app.close());

  it("accepts a report from the signed-in user", async () => {
    mockCreate.mockResolvedValue({ id: "r-1", reporterId: VALID_USER.id, targetType: "GAME" });
    const response = await request(app.getHttpServer()).post("/reports")
      .set({ Authorization: "Bearer user-token" })
      .send({ targetType: "GAME", targetId: "00000000-0000-0000-0000-000000000010", reason: "Unsafe or abusive game content" });
    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(VALID_USER.id, expect.objectContaining({ targetType: "GAME" }));
  });

  it("rejects a short report reason", async () => {
    const response = await request(app.getHttpServer()).post("/reports")
      .set(authBearer(VALID_USER))
      .send({ targetType: "GAME", targetId: "00000000-0000-0000-0000-000000000010", reason: "bad" });
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("protects the moderation queue from non-admin users", async () => {
    const response = await request(app.getHttpServer()).get("/reports/admin/open").set(authBearer(VALID_USER));
    expect(response.status).toBe(401);
    expect(mockListOpen).not.toHaveBeenCalled();
  });

  it("allows an admin to read the open moderation queue", async () => {
    mockListOpen.mockResolvedValue([{ id: "r-1", status: "OPEN" }]);
    const response = await request(app.getHttpServer()).get("/reports/admin/open").set({ Authorization: "Bearer admin-token" });
    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });
});
