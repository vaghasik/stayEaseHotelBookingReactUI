import { Link } from "react-router-dom";
import type { Hotel } from "../types";

const FALLBACK_IMAGE = "/images/hotel-placeholder.jpg";

export default function HotelCard({
  hotel,
  fromPrice,
  searchQuery = "",
}: {
  hotel: Hotel;
  fromPrice?: number;
  /** Optional "?checkIn=...&checkOut=..." to carry the current search's dates through to the hotel's detail page. */
  searchQuery?: string;
}) {
  return (
    <Link
      to={`/hotels/${hotel.id}${searchQuery}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "140px 1fr auto",
          gap: 20,
          padding: "20px 4px",
          alignItems: "center",
        }}
      >
        <img
          src={hotel.coverImageUrl || FALLBACK_IMAGE}
          alt={hotel.name}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = FALLBACK_IMAGE;
            e.currentTarget.onerror = null;
          }}
          style={{
            width: 140,
            height: 100,
            objectFit: "cover",
            borderRadius: 3,
            border: "1px solid var(--line)",
          }}
        />
        <div>
          <div className="stars" aria-label={`${hotel.starRating} stars`}>
            {"★".repeat(hotel.starRating)}
            <span style={{ color: "var(--line-strong)" }}>
              {"★".repeat(5 - hotel.starRating)}
            </span>
          </div>
          <h3 style={{ fontSize: "1.25rem", marginTop: 4 }}>{hotel.name}</h3>
          <p className="eyebrow" style={{ marginTop: 4 }}>{hotel.city}</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {fromPrice !== undefined && (
            <>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>from</div>
              <div className="mono" style={{ fontSize: "1.3rem", fontWeight: 600 }}>
                ₹{fromPrice.toLocaleString("en-IN")}
              </div>
              <div style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>/ night</div>
            </>
          )}
        </div>
      </div>
      <div className="hairline" />
    </Link>
  );
}
