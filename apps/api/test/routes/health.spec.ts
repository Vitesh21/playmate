import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp } from "../helpers";

describe("Health routes (e2e)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("GET /health", () => {
    it("returns ok status with timestamp and uptime", async () => {
      const res = await request(app.getHttpServer()).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe("ok");
      expect(typeof res.body.data.timestamp).toBe("string");
      expect(typeof res.body.data.uptime).toBe("number");
      expect(res.body.data.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});
