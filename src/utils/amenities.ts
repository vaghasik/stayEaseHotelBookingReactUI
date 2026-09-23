// The fixed set of amenities an admin can toggle for a hotel (must match
// com.stayease.enums.Amenity on the backend exactly - these are sent/
// received as plain uppercase strings, e.g. "AIR_CONDITIONING").
export const AMENITY_OPTIONS = [
  "WIFI",
  "PARKING",
  "POOL",
  "GYM",
  "SPA",
  "RESTAURANT",
  "BAR",
  "AIR_CONDITIONING",
  "PET_FRIENDLY",
  "ROOM_SERVICE",
  "BREAKFAST_INCLUDED",
  "AIRPORT_SHUTTLE",
  "LAUNDRY",
  "BUSINESS_CENTER",
  "ELEVATOR",
] as const;

export type Amenity = (typeof AMENITY_OPTIONS)[number];

const AMENITY_LABELS: Record<string, string> = {
  WIFI: "Free Wi-Fi",
  PARKING: "Parking",
  POOL: "Swimming Pool",
  GYM: "Gym",
  SPA: "Spa",
  RESTAURANT: "Restaurant",
  BAR: "Bar",
  AIR_CONDITIONING: "Air Conditioning",
  PET_FRIENDLY: "Pet Friendly",
  ROOM_SERVICE: "Room Service",
  BREAKFAST_INCLUDED: "Breakfast Included",
  AIRPORT_SHUTTLE: "Airport Shuttle",
  LAUNDRY: "Laundry",
  BUSINESS_CENTER: "Business Center",
  ELEVATOR: "Elevator",
};

// Turns the backend's UPPER_SNAKE_CASE amenity value into a friendly label.
// Falls back to a generic title-case conversion for anything not in the
// known list, so a value the frontend doesn't recognise yet still renders
// reasonably instead of showing raw enum text.
export function formatAmenity(value: string): string {
  if (AMENITY_LABELS[value]) return AMENITY_LABELS[value];
  return value
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
