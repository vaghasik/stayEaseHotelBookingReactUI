import type { RoomType } from "../types";

const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  SINGLE: "Single",
  DOUBLE: "Double",
  DELUXE: "Deluxe",
  SUITE: "Suite",
  FAMILY: "Family",
};

// The wire format for RoomType is uppercase (matches the backend enum
// exactly, see types.ts). Use this wherever a room type is shown to a
// person instead of rendering the raw enum value.
export function formatRoomType(type: RoomType): string {
  return ROOM_TYPE_LABELS[type] ?? type;
}

export const ROOM_TYPE_OPTIONS: RoomType[] = ["SINGLE", "DOUBLE", "DELUXE", "SUITE", "FAMILY"];

// Local, bundled placeholder images per room type - not hotlinked from an
// external site. Every room type previously fell back to the exact same
// single hardcoded Unsplash URL (in ManagerDashboard's default form), so
// if that one URL didn't load for any reason (network policy, a deleted
// photo, rate limiting), every room type broke identically and looked the
// same. These are served from this app's own /public folder, so they don't
// depend on any external network call, and they're visually distinct per
// room type.
const ROOM_TYPE_IMAGES: Record<RoomType, string> = {
  SINGLE: "/images/rooms/single.jpg",
  DOUBLE: "/images/rooms/double.jpg",
  DELUXE: "/images/rooms/deluxe.jpg",
  SUITE: "/images/rooms/suite.jpg",
  FAMILY: "/images/rooms/family.jpg",
};

// Use as the default image when creating a room of this type, and as the
// fallback if a room's own imageUrl is missing or fails to load.
export function defaultRoomImage(type: RoomType): string {
  return ROOM_TYPE_IMAGES[type] ?? ROOM_TYPE_IMAGES.SINGLE;
}

// Decide which image to actually show for a room.
//
// The problem this solves: existing rooms in the database were all seeded
// with the SAME single generic image URL regardless of room type, so every
// room showed an identical picture (and if that one external URL failed to
// load, they all broke together). The person asked for a *different* image
// per room type.
//
// So: only honour a room's own imageUrl when it looks like a genuinely
// custom, per-room image. If it's empty, or it's one of the known generic
// defaults (the old hardcoded Unsplash URL, or any of our own per-type
// placeholders), fall back to the bundled image for that room's type - so
// each type is visually distinct and nothing depends on an external host.
const GENERIC_IMAGE_MARKERS = [
  "photo-1611892440504", // the old single hardcoded Unsplash URL used for every seeded room
  "/images/rooms/",       // our own bundled per-type images
];

export function roomDisplayImage(room: { imageUrl?: string | null; roomType: RoomType }): string {
  const url = (room.imageUrl ?? "").trim();
  const isGeneric = url === "" || GENERIC_IMAGE_MARKERS.some((m) => url.includes(m));
  return isGeneric ? defaultRoomImage(room.roomType) : url;
}
