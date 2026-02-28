import { describe, it, expect } from "vitest";
import { formatDateYYYYMMDD, formatDate } from "./time";

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

describe("formatDate", () => {
  it("formats yyyy-MM-dd identical to formatDateYYYYMMDD", () => {
    const d = new Date(2024, 0, 15, 10, 30, 45);
    expect(formatDate(d, "yyyy-MM-dd")).toBe("2024-01-15");
  });

  it("includes time components", () => {
    const d = new Date(2024, 5, 3, 9, 5, 7);
    expect(formatDate(d, "yyyy-MM-dd HH:mm:ss")).toBe("2024-06-03 09:05:07");
  });

  it("includes timezone offset with xx token", () => {
    const d = new Date(2024, 0, 15, 10, 30, 0);
    const result = formatDate(d, "yyyy-MM-dd HH:mm:ss xx");
    // Should match pattern: 2024-01-15 10:30:00 +HHMM or -HHMM
    expect(result).toMatch(/^2024-01-15 10:30:00 [+-]\d{4}$/);
  });

  it("includes timezone offset with xxx token (colon)", () => {
    const d = new Date(2024, 0, 15, 10, 30, 0);
    const result = formatDate(d, "yyyy-MM-dd HH:mm:ss xxx");
    // Should match pattern: 2024-01-15 10:30:00 +HH:MM or -HH:MM
    expect(result).toMatch(/^2024-01-15 10:30:00 [+-]\d{2}:\d{2}$/);
  });

  it("handles midnight correctly", () => {
    const d = new Date(2024, 0, 1, 0, 0, 0);
    expect(formatDate(d, "yyyy-MM-dd HH:mm:ss")).toBe("2024-01-01 00:00:00");
  });
});
