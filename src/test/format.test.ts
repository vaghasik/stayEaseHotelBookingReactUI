import { describe, it, expect } from "vitest";
import { defaultRoomImage, formatRoomType, roomDisplayImage } from "../utils/format";

describe("formatRoomType", () => {
  it("maps each known room type to a friendly label", () => {
    expect(formatRoomType("SINGLE")).toBe("Single");
    expect(formatRoomType("DOUBLE")).toBe("Double");
    expect(formatRoomType("DELUXE")).toBe("Deluxe");
    expect(formatRoomType("SUITE")).toBe("Suite");
  });
});

describe("defaultRoomImage", () => {
  it("returns a distinct local image per room type", () => {
    const images = ["SINGLE", "DOUBLE", "DELUXE", "SUITE"].map((t) =>
      defaultRoomImage(t as any)
    );
    // all four should be different files
    expect(new Set(images).size).toBe(4);
    images.forEach((src) => expect(src).toMatch(/^\/images\/rooms\//));
  });
});

describe("roomDisplayImage", () => {
  it("uses the room's own imageUrl when it looks custom", () => {
    const src = roomDisplayImage({ imageUrl: "https://cdn.example.com/my-room.jpg", roomType: "SUITE" });
    expect(src).toBe("https://cdn.example.com/my-room.jpg");
  });

  it("falls back to the per-type image when imageUrl is empty", () => {
    const src = roomDisplayImage({ imageUrl: "", roomType: "DELUXE" });
    expect(src).toBe(defaultRoomImage("DELUXE"));
  });

  it("falls back to the per-type image when imageUrl is the old shared generic URL", () => {
    // This is the regression this function exists to fix: every seeded room
    // used to carry the exact same generic Unsplash URL regardless of type.
    const genericUrl = "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800";
    const single = roomDisplayImage({ imageUrl: genericUrl, roomType: "SINGLE" });
    const suite = roomDisplayImage({ imageUrl: genericUrl, roomType: "SUITE" });
    expect(single).toBe(defaultRoomImage("SINGLE"));
    expect(suite).toBe(defaultRoomImage("SUITE"));
    expect(single).not.toBe(suite);
  });

  it("falls back when imageUrl is null", () => {
    const src = roomDisplayImage({ imageUrl: null, roomType: "SINGLE" });
    expect(src).toBe(defaultRoomImage("SINGLE"));
  });
});
