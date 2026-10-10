import { ZodValidationPipe } from "nestjs-zod";
import { Test } from "@nestjs/testing";
import type { TestingModule } from "@nestjs/testing";
import { AppModule } from "@/app.module";

export async function createTestApp() {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();
  app.useGlobalPipes(new ZodValidationPipe());
  await app.init();
  return app;
}

export const VALID_USER = {
  id: "00000000-0000-0000-0000-000000000001",
  email: "user@example.com",
  role: "USER",
};

export const VALID_VENUE_OWNER = {
  id: "00000000-0000-0000-0000-000000000002",
  email: "owner@example.com",
  role: "VENUE_OWNER",
};

export const VALID_ADMIN = {
  id: "00000000-0000-0000-0000-000000000003",
  email: "admin@example.com",
  role: "ADMIN",
};

export function authBearer(_user: Record<string, any> = VALID_USER) {
  return { Authorization: "Bearer dummy-jwt-token" };
}
