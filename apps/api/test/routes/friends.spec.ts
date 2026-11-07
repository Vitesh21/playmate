import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_USER, authBearer } from "../helpers";
import { SupabaseService } from "@/common/supabase.service";
import { UsersService } from "@/users/users.service";

const mockGetUser = jest.fn();
const mockFriends = jest.fn();
const mockFriendRequests = jest.fn();
const mockRequestFriend = jest.fn();
const mockRespond = jest.fn();
const mockRemove = jest.fn();

jest.mock("@/users/users.service", () => ({
  UsersService: jest.fn().mockImplementation(() => ({
    friends: mockFriends,
    friendRequests: mockFriendRequests,
    requestFriend: mockRequestFriend,
    respondFriendRequest: mockRespond,
    removeFriend: mockRemove,
  })),
}));

describe("Playpals routes (e2e)", () => {
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

  it("lists the signed-in player's playpals", async () => {
    mockFriends.mockResolvedValue([{ id: "friend-1", firstName: "Rally" }]);
    const response = await request(app.getHttpServer()).get("/friends").set(authBearer());
    expect(response.status).toBe(200);
    expect(response.body.data[0].firstName).toBe("Rally");
    expect(mockFriends).toHaveBeenCalledWith(VALID_USER.id);
  });

  it("sends a playpal request using the authenticated requester id", async () => {
    mockRequestFriend.mockResolvedValue({ id: "request-1", status: "PENDING" });
    const response = await request(app.getHttpServer()).post("/friends/requests").set(authBearer()).send({ email: "rally@example.com" });
    expect(response.status).toBe(201);
    expect(mockRequestFriend).toHaveBeenCalledWith(VALID_USER.id, "rally@example.com");
  });

  it("validates friend request email addresses", async () => {
    const response = await request(app.getHttpServer()).post("/friends/requests").set(authBearer()).send({ email: "invalid" });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockRequestFriend).not.toHaveBeenCalled();
  });

  it("accepts or declines only through the authenticated recipient identity", async () => {
    mockRespond.mockResolvedValue({ id: "request-1", status: "ACCEPTED" });
    const response = await request(app.getHttpServer()).patch("/friends/requests/request-1").set(authBearer()).send({ accept: true });
    expect(response.status).toBe(200);
    expect(mockRespond).toHaveBeenCalledWith(VALID_USER.id, "request-1", true);
  });

  it("requires authentication for the playpals list", async () => {
    const response = await request(app.getHttpServer()).get("/friends");
    expect(response.status).toBe(401);
    expect(mockFriends).not.toHaveBeenCalled();
  });
});
