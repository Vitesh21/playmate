import { BadRequestException } from "@nestjs/common";
import { orderAndValidateConsecutiveSlots } from "@/bookings/bookings.service";

const slot = (startTime: string, endTime: string, overrides: Partial<{ courtId: string; date: string }> = {}) => ({
  id: `${startTime}-${endTime}`,
  courtId: overrides.courtId ?? "court-1",
  date: overrides.date ?? "2026-11-08",
  startTime,
  endTime,
});

describe("multi-slot booking selection", () => {
  it("sorts selected slots and accepts a contiguous run on one court and date", () => {
    const result = orderAndValidateConsecutiveSlots([slot("19:00", "20:00"), slot("18:00", "19:00")]);
    expect(result.map(({ startTime }) => startTime)).toEqual(["18:00", "19:00"]);
  });

  it("rejects gaps between selected slots", () => {
    expect(() => orderAndValidateConsecutiveSlots([slot("18:00", "19:00"), slot("20:00", "21:00")])).toThrow(BadRequestException);
  });

  it("rejects slots from different courts or dates", () => {
    expect(() => orderAndValidateConsecutiveSlots([slot("18:00", "19:00"), slot("19:00", "20:00", { courtId: "court-2" })])).toThrow(BadRequestException);
    expect(() => orderAndValidateConsecutiveSlots([slot("18:00", "19:00"), slot("19:00", "20:00", { date: "2026-11-09" })])).toThrow(BadRequestException);
  });

  it("caps a checkout to ten slots", () => {
    const slots = Array.from({ length: 11 }, (_, index) => slot(`${String(index).padStart(2, "0")}:00`, `${String(index + 1).padStart(2, "0")}:00`));
    expect(() => orderAndValidateConsecutiveSlots(slots)).toThrow(BadRequestException);
  });
});
