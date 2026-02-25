import { describe, it, expect } from "vitest";
import { formatDateYYYYMMDD } from "./time";

describe("formatDateYYYYMMDD", () => {
  it("formats a known date correctly", () => {
    const d = new Date(2024, 0, 15); // Jan 15, 2024
    expect(formatDateYYYYMMDD(d)).toBe("2024-01-15");
  });

  it("zero-pads single-digit months", () => {
    const d = new Date(2024, 2, 10); // March 10, 2024
    expect(formatDateYYYYMMDD(d)).toBe("2024-03-10");
  });

  it("zero-pads single-digit days", () => {
    const d = new Date(2024, 11, 5); // Dec 5, 2024
    expect(formatDateYYYYMMDD(d)).toBe("2024-12-05");
  });

  it("handles last day of year", () => {
    const d = new Date(2024, 11, 31); // Dec 31, 2024
    expect(formatDateYYYYMMDD(d)).toBe("2024-12-31");
  });

  it("handles first day of year", () => {
    const d = new Date(2025, 0, 1); // Jan 1, 2025
    expect(formatDateYYYYMMDD(d)).toBe("2025-01-01");
  });

  it("handles double-digit months and days without extra padding", () => {
    const d = new Date(2024, 10, 25); // Nov 25, 2024
    expect(formatDateYYYYMMDD(d)).toBe("2024-11-25");
  });
});
