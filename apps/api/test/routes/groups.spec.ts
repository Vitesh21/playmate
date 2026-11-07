import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_USER, authBearer } from "../helpers";
import { SupabaseService } from "@/common/supabase.service";
import { UsersService } from "@/users/users.service";

const mockGetUser = jest.fn();
const mockList = jest.fn();
const mockCreate = jest.fn();
const mockMessages = jest.fn();
const mockSend = jest.fn();
const mockLeave = jest.fn();
const mockAdd = jest.fn();

jest.mock("@/users/users.service", () => ({
  UsersService: jest.fn().mockImplementation(() => ({
    listGroups: mockList,
    createGroup: mockCreate,
    groupMessagesFor: mockMessages,
    sendGroupMessage: mockSend,
    leaveGroup: mockLeave,
    addGroupMember: mockAdd,
  })),
}));

describe("Groups and group chat routes (e2e)", () => {
  let app: INestApplication;
  beforeAll(async () => {
    app = await createTestApp();
    (app.get(SupabaseService) as any).admin = { auth: { getUser: mockGetUser } };
  });
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUser.mockResolvedValue({ data: { user: { ...VALID_USER, app_metadata: { role: "USER" } } }, error: null });
  });
  afterAll(async () => app.close());

  it("creates a group for the authenticated player", async () => {
    mockCreate.mockResolvedValue({ id: "group-1", name: "Sunday football" });
    const response = await request(app.getHttpServer()).post("/groups").set(authBearer()).send({ name: "Sunday football" });
    expect(response.status).toBe(201);
    expect(mockCreate).toHaveBeenCalledWith(VALID_USER.id, expect.objectContaining({ name: "Sunday football" }));
  });

  it("rejects an empty group name", async () => {
    const response = await request(app.getHttpServer()).post("/groups").set(authBearer()).send({ name: "  " });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it("returns chat messages only through the signed-in group service path", async () => {
    mockMessages.mockResolvedValue([{ id: "message-1", body: "Court is booked" }]);
    const response = await request(app.getHttpServer()).get("/groups/group-1/messages").set(authBearer());
    expect(response.status).toBe(200);
    expect(mockMessages).toHaveBeenCalledWith(VALID_USER.id, "group-1");
  });

  it("sends a validated group message", async () => {
    mockSend.mockResolvedValue({ id: "message-1", body: "See you there" });
    const response = await request(app.getHttpServer()).post("/groups/group-1/messages").set(authBearer()).send({ body: "See you there" });
    expect(response.status).toBe(201);
    expect(mockSend).toHaveBeenCalledWith(VALID_USER.id, "group-1", "See you there");
  });

  it("rejects empty messages", async () => {
    const response = await request(app.getHttpServer()).post("/groups/group-1/messages").set(authBearer()).send({ body: "  " });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockSend).not.toHaveBeenCalled();
  });
});
