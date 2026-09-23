import type { Room } from "../types";
import { defaultRoomImage, formatRoomType, roomDisplayImage } from "../utils/format";

export default function RoomCard({
  room,
  onBook,
  booking,
}: {
  room: Room;
  onBook: (room: Room) => void;
  booking: boolean;
}) {
  const fallback = defaultRoomImage(room.roomType);
  const src = roomDisplayImage(room);
  return (
    <div
      className="card"
      style={{
        display: "grid",
        gridTemplateColumns: "160px 1fr auto",
        gap: 20,
        padding: 18,
        alignItems: "center",
      }}
    >
      <img
        src={src}
        alt={formatRoomType(room.roomType)}
        loading="lazy"
        onError={(e) => {
          e.currentTarget.src = fallback;
          e.currentTarget.onerror = null;
        }}
        style={{ width: 160, height: 110, objectFit: "cover", borderRadius: 3, border: "1px solid var(--line)" }}
      />
      <div>
        <span className="eyebrow">{formatRoomType(room.roomType)}</span>
        <h4 style={{ fontSize: "1.1rem", marginTop: 4 }}>Room {room.roomNumber}</h4>
        <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: 6, maxWidth: 420 }}>
          {room.description}
        </p>
        <p className="mono" style={{ fontSize: "0.78rem", marginTop: 8, color: "var(--ink-soft)" }}>
          Sleeps {room.maxOccupancy}
        </p>
      </div>
      <div style={{ textAlign: "right", display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
        <div>
          <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 600 }}>
            ₹{room.pricePerNight.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>/ night</div>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => onBook(room)} disabled={booking}>
          {booking ? "Booking…" : "Book"}
        </button>
      </div>
    </div>
  );
}
