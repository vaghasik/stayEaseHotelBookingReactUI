import { describe, it, expect } from "vitest";
import { AMENITY_OPTIONS, formatAmenity } from "../utils/amenities";

describe("formatAmenity", () => {
  it("formats known amenities with friendly labels", () => {
    expect(formatAmenity("WIFI")).toBe("Free Wi-Fi");
    expect(formatAmenity("AIR_CONDITIONING")).toBe("Air Conditioning");
    expect(formatAmenity("BREAKFAST_INCLUDED")).toBe("Breakfast Included");
  });

  it("falls back to a readable title-case conversion for an unknown value", () => {
    expect(formatAmenity("SOME_NEW_THING")).toBe("Some New Thing");
  });

  it("has a friendly label for every option in the fixed list", () => {
    AMENITY_OPTIONS.forEach((a) => {
      const label = formatAmenity(a);
      expect(label).not.toMatch(/_/); // never leaks raw enum formatting
      expect(label.length).toBeGreaterThan(0);
    });
  });
});
