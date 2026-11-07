import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_ADMIN, VALID_USER, authBearer } from "../helpers";
import { SupabaseService } from "@/common/supabase.service";
import { UsersService } from "@/users/users.service";

const mockGetUser = jest.fn();
const mockFindById = jest.fn();
const mockFindAll = jest.fn();
const mockUpdate = jest.fn();
const mockRemove = jest.fn();
const mockGetMyProfile = jest.fn();
const mockUpdateMyProfile = jest.fn();
const mockPublicProfile = jest.fn();

jest.mock("@/users/users.service", () => ({
  UsersService: jest.fn().mockImplementation(() => ({
    findById: mockFindById,
    findAll: mockFindAll,
    update: mockUpdate,
    remove: mockRemove,
    getMyProfile: mockGetMyProfile,
    updateMyProfile: mockUpdateMyProfile,
    publicProfile: mockPublicProfile,
  })),
}));

describe("Users routes (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
    (app.get(SupabaseService) as any).admin = { auth: { getUser: mockGetUser } };
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockImplementation(async () => ({
      data: { user: { ...VALID_USER, app_metadata: { role: "USER" } } },
      error: null,
    }));
  });

  afterAll(async () => app.close());

  it("serves the external account deletion request page", async () => {
    const response = await request(app.getHttpServer()).get("/account-deletion");
    expect(response.status).toBe(200);
    expect(response.text).toContain("Delete your Playmate account");
    expect(response.text).toContain("/users/me");
  });

  it("returns and updates the authenticated player's extended profile", async () => {
    mockGetMyProfile.mockResolvedValue({ id: VALID_USER.id, profile: { bio: "Badminton fan" } });
    mockUpdateMyProfile.mockResolvedValue({ id: VALID_USER.id, profile: { bio: "Badminton fan" } });
    const get = await request(app.getHttpServer()).get("/users/me/profile").set(authBearer(VALID_USER));
    const update = await request(app.getHttpServer()).patch("/users/me/profile").set(authBearer(VALID_USER)).send({ bio: "Badminton fan" });
    expect(get.status).toBe(200);
    expect(update.status).toBe(200);
    expect(mockUpdateMyProfile).toHaveBeenCalledWith(VALID_USER.id, { bio: "Badminton fan" });
  });

  it("validates profile privacy and skill values", async () => {
    const response = await request(app.getHttpServer()).patch("/users/me/profile").set(authBearer(VALID_USER)).send({ privacy: { profileVisibility: "EVERYONE" } });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockUpdateMyProfile).not.toHaveBeenCalled();
  });

  it("serves the privacy-filtered player profile route", async () => {
    mockPublicProfile.mockResolvedValue({ id: VALID_ADMIN.id, firstName: "Rally", visibility: "PUBLIC" });
    const response = await request(app.getHttpServer()).get(`/users/${VALID_ADMIN.id}/public-profile`).set(authBearer(VALID_USER));
    expect(response.status).toBe(200);
    expect(response.body.data.visibility).toBe("PUBLIC");
  });

  it("does not allow a user to read another user's profile", async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${VALID_ADMIN.id}`)
      .set(authBearer(VALID_USER));
    expect(response.status).toBe(403);
    expect(mockFindById).not.toHaveBeenCalled();
  });

  it("only updates the authenticated user's profile", async () => {
    mockUpdate.mockResolvedValue({ ...VALID_USER, firstName: "Updated" });
    const response = await request(app.getHttpServer())
      .patch("/users/me")
      .set(authBearer(VALID_USER))
      .send({ firstName: "Updated" });
    expect(response.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(VALID_USER.id, { firstName: "Updated" });
  });

  it("deletes only the authenticated account", async () => {
    mockRemove.mockResolvedValue(undefined);
    const response = await request(app.getHttpServer())
      .delete("/users/me")
      .set(authBearer(VALID_USER));
    expect(response.status).toBe(200);
    expect(mockRemove).toHaveBeenCalledWith(VALID_USER.id);
  });

  it("requires admin authorization to list profiles", async () => {
    const response = await request(app.getHttpServer())
      .get("/users")
      .set(authBearer(VALID_USER));
    expect(response.status).toBe(401);
    expect(mockFindAll).not.toHaveBeenCalled();
  });
});
