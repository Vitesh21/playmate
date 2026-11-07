import { hasTimeConflict } from "@/games/games.service";

describe("game calendar conflict detection", () => {
  const event = (start: string, end: string) => ({ startsAt: new Date(start), endsAt: new Date(end) });
  it("detects an overlapping interval", () => {
    expect(hasTimeConflict(new Date("2026-11-08T10:30:00Z"), new Date("2026-11-08T11:30:00Z"), [
      event("2026-11-08T10:00:00Z", "2026-11-08T11:00:00Z"),
    ])).toBe(true);
  });
  it("allows directly adjacent events", () => {
    expect(hasTimeConflict(new Date("2026-11-08T11:00:00Z"), new Date("2026-11-08T12:00:00Z"), [
      event("2026-11-08T10:00:00Z", "2026-11-08T11:00:00Z"),
    ])).toBe(false);
  });
  it("returns false when no calendar events exist", () => {
    expect(hasTimeConflict(new Date(), new Date(Date.now() + 3600000), [])).toBe(false);
  });
});
