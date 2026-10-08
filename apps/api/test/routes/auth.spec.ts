import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../helpers";
import { AuthService } from "@/auth/auth.service";
import { AuthGuard } from "@/common/auth.guard";
import { SupabaseService } from "@/common/supabase.service";
import { VALID_USER, VALID_ADMIN, authBearer } from "../helpers";

const mockSignUp = jest.fn();
const mockSignIn = jest.fn();
const mockSignOut = jest.fn();
const mockResetPassword = jest.fn();
const mockGetUser = jest.fn();

jest.mock("@/auth/auth.service", () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    signUp: mockSignUp,
    signIn: mockSignIn,
    signOut: mockSignOut,
    resetPassword: mockResetPassword,
  })),
}));

describe("Auth routes (e2e)", () => {
  let app: INestApplication;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSignIn.mockRejectedValueOnce(new Error("bad credentials")).mockRejectedValueOnce(
      new Error("bad credentials"),
    );
  });

  beforeAll(async () => {
    app = await createTestApp();
    const sb = app.get(SupabaseService);
    (sb as any).admin = { auth: { getUser: mockGetUser } };
  });

  afterAll(async () => {
    await app.close();
  });

  describe("POST /auth/signup", () => {
    it("rejects signup with malformed email", async () => {
      mockSignUp.mockRejectedValue(new Error("invalid email"));
      const res = await request(app.getHttpServer())
        .post("/auth/signup")
        .send({ email: "not-an-email", password: "123" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("rejects signup with short password (Zod validation in service)", async () => {
      mockSignUp.mockRejectedValue(new Error("password too short"));
      const res = await request(app.getHttpServer())
        .post("/auth/signup")
        .send({ email: "ok@example.com", password: "a" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("accepts valid signup and returns success shape", async () => {
      mockSignUp.mockResolvedValue({ user: { id: "u1", email: "ok@example.com" } });
      const res = await request(app.getHttpServer())
        .post("/auth/signup")
        .send({ email: "ok@example.com", password: "strongp@ss12" });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe("ok@example.com");
    });
  });

  describe("POST /auth/login", () => {
    it("returns 401 family response on invalid credentials", async () => {
      mockSignIn.mockReset();
      mockSignIn.mockRejectedValue(new Error("invalid credentials"));
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "wrong@example.com", password: "wrongpw" });
      expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("returns session shape on valid login", async () => {
      mockSignIn.mockReset();
      mockSignIn.mockResolvedValue({
        accessToken: "at",
        refreshToken: "rt",
        user: VALID_USER,
      });
      const res = await request(app.getHttpServer())
        .post("/auth/login")
        .send({ email: "user@example.com", password: "correct" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.role).toBe("USER");
    });
  });

  describe("POST /auth/logout", () => {
    it("requires authorization header (401)", async () => {
      const res = await request(app.getHttpServer()).post("/auth/logout");
      expect(res.status).toBe(401);
    });
  });

  describe("GET /auth/me", () => {
    it("returns 401 without bearer token", async () => {
      const res = await request(app.getHttpServer()).get("/auth/me");
      expect(res.status).toBe(401);
    });

    it("returns user payload when authenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: VALID_ADMIN }, error: null });
      const res = await request(app.getHttpServer())
        .get("/auth/me")
        .set(authBearer(VALID_ADMIN));
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.role).toBe("ADMIN");
    });
  });

  describe("POST /auth/reset-password", () => {
    it("returns success shape without leaking existence", async () => {
      mockResetPassword.mockResolvedValue(undefined);
      const res = await request(app.getHttpServer())
        .post("/auth/reset-password")
        .send({ email: "any@example.com" });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
