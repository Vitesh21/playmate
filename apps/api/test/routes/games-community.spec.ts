import request from "supertest";
import type { INestApplication } from "@nestjs/common";
import { createTestApp, VALID_USER, authBearer } from "../helpers";
import { SupabaseService } from "@/common/supabase.service";
import { GamesService } from "@/games/games.service";

const mockGetUser = jest.fn();
const mockInvite = jest.fn();
const mockMyInvites = jest.fn();
const mockDecideInvite = jest.fn();
const mockMakeCohost = jest.fn();

jest.mock("@/games/games.service", () => ({
  GamesService: jest.fn().mockImplementation(() => ({
    invite: mockInvite,
    myInvites: mockMyInvites,
    decideInvite: mockDecideInvite,
    makeCohost: mockMakeCohost,
  })),
}));

describe("Game invitation and co-host routes (e2e)", () => {
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

  it("lets the authenticated host invite a valid player id", async () => {
    mockInvite.mockResolvedValue({ id: "invite-1", status: "PENDING" });
    const response = await request(app.getHttpServer()).post("/games/game-1/invites").set(authBearer()).send({ inviteeId: "00000000-0000-0000-0000-000000000002" });
    expect(response.status).toBe(201);
    expect(mockInvite).toHaveBeenCalledWith("game-1", VALID_USER.id, "00000000-0000-0000-0000-000000000002");
  });

  it("rejects malformed invitee ids before calling the service", async () => {
    const response = await request(app.getHttpServer()).post("/games/game-1/invites").set(authBearer()).send({ inviteeId: "bad-id" });
    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(mockInvite).not.toHaveBeenCalled();
  });

  it("shows pending invites to the signed-in recipient", async () => {
    mockMyInvites.mockResolvedValue([{ invite: { id: "invite-1" }, game: { title: "Evening badminton" } }]);
    const response = await request(app.getHttpServer()).get("/games/invites").set(authBearer());
    expect(response.status).toBe(200);
    expect(mockMyInvites).toHaveBeenCalledWith(VALID_USER.id);
  });

  it("accepts or declines an invite for the authenticated recipient", async () => {
    mockDecideInvite.mockResolvedValue({ id: "invite-1", status: "ACCEPTED" });
    const response = await request(app.getHttpServer()).patch("/games/invites/invite-1").set(authBearer()).send({ accept: true });
    expect(response.status).toBe(200);
    expect(mockDecideInvite).toHaveBeenCalledWith("invite-1", VALID_USER.id, true);
  });

  it("lets the host appoint an approved participant as co-host", async () => {
    mockMakeCohost.mockResolvedValue({ id: "participant-1", role: "COHOST" });
    const response = await request(app.getHttpServer()).post("/games/game-1/participants/participant-1/cohost").set(authBearer());
    expect(response.status).toBe(201);
    expect(mockMakeCohost).toHaveBeenCalledWith("game-1", "participant-1", VALID_USER.id);
  });
});
