import { describe, it, expect } from "vitest";
import { calculateAge, yearsSince, formatDateRange } from "./dates";

describe("calculateAge", () => {
  it("returns the age when the birthday already happened this year", () => {
    expect(calculateAge("2000-01-15", new Date("2026-06-21"))).toBe(26);
  });

  it("returns one less when the birthday has not happened yet this year", () => {
    expect(calculateAge("2000-01-15", new Date("2027-01-14"))).toBe(26);
  });

  it("increments on the exact birthday", () => {
    expect(calculateAge("2000-01-15", new Date("2027-01-15"))).toBe(27);
  });
});

describe("yearsSince", () => {
  it("counts full years elapsed since a year-month date", () => {
    expect(yearsSince("2020-02", new Date("2026-06-21"))).toBe(6);
  });

  it("does not count the current year if the anniversary has not happened yet", () => {
    expect(yearsSince("2018-12", new Date("2026-06-21"))).toBe(7);
  });

  it("counts full years elapsed since a year-only date", () => {
    expect(yearsSince("2011", new Date("2026-06-21"))).toBe(15);
  });
});

describe("formatDateRange", () => {
  it("formats a completed multi-year range with duration", () => {
    expect(formatDateRange("2014", "2019")).toBe("2014 – 2019 (5 yrs)");
  });

  it("collapses a same-year entry to just that year", () => {
    expect(formatDateRange("2018", "2018")).toBe("2018");
  });

  it("formats an ongoing year-month range as Present with duration", () => {
    expect(formatDateRange("2020-02", undefined, new Date("2026-06-21"))).toBe(
      "Feb 2020 – Present (6 yrs)"
    );
  });
});
