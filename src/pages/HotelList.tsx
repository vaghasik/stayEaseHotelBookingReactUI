import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import HotelCard from "../components/HotelCard";
import * as api from "../services/api";
import { loadSearchPrefs, saveSearchPrefs } from "../utils/searchPrefs";
import type { Hotel, Room } from "../types";

export default function HotelList() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Arriving with no query string at all (e.g. the "Browse more hotels"
  // link from the booking confirmation page, or just typing /hotels in
  // directly) shouldn't force re-entering dates that were already picked
  // this session - fall back to the last remembered search once, on the
  // very first render, instead of showing "Any dates" / all hotels.
  const [prefsApplied, setPrefsApplied] = useState(false);
  useEffect(() => {
    if (prefsApplied) return;
    if (searchParams.toString() === "") {
      const remembered = loadSearchPrefs();
      if (remembered.city || remembered.checkIn || remembered.checkOut) {
        const params = new URLSearchParams();
        if (remembered.city) params.set("city", remembered.city);
        if (remembered.checkIn) params.set("checkIn", remembered.checkIn);
        if (remembered.checkOut) params.set("checkOut", remembered.checkOut);
        setSearchParams(params, { replace: true });
      }
    }
    setPrefsApplied(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const city = searchParams.get("city") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  // Carried through to each hotel's detail page so picking a hotel from the
  // list doesn't ask the person to re-enter the dates they already chose.
  const dateQuery = checkIn && checkOut ? `?checkIn=${checkIn}&checkOut=${checkOut}` : "";

  const [cityInput, setCityInput] = useState(city);
  const [checkInInput, setCheckInInput] = useState(checkIn);
  const [checkOutInput, setCheckOutInput] = useState(checkOut);
  const [dateError, setDateError] = useState("");
  const today = new Date().toISOString().split("T")[0];
  // Placeholder 1-night window, a couple of days out, used only to price
  // hotels via the public availability endpoint when the guest hasn't
  // picked real dates yet (see the effect below).
  const defaultPriceCheckIn = new Date(Date.now() + 2 * 86400000).toISOString().split("T")[0];
  const defaultPriceCheckOut = new Date(Date.now() + 3 * 86400000).toISOString().split("T")[0];
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [pricesByHotel, setPricesByHotel] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCityInput(city);
    setCheckInInput(checkIn);
    setCheckOutInput(checkOut);
  }, [city, checkIn, checkOut]);

  useEffect(() => {
    if (!prefsApplied) return;
    saveSearchPrefs({ city, checkIn, checkOut });
  }, [prefsApplied, city, checkIn, checkOut]);

  useEffect(() => {
    let cancelled = false;

    // City is a required search field (per the spec's search form) - there's
    // no public "browse all hotels" endpoint on the backend (GET /api/hotels/all
    // is ADMIN-only), so without a city we just show the empty/prompt state
    // instead of calling an endpoint guests aren't allowed to use.
    if (!city) {
      setHotels([]);
      setPricesByHotel({});
      setLoading(false);
      return;
    }

    setLoading(true);
    api
      .searchHotels(city)
      .then(async (results) => {
        if (cancelled) return;

        const prices: Record<string, number> = {};
        const hasDates = Boolean(checkIn && checkOut);

        // Resolve each hotel's rooms via the public availability endpoint.
        // When the user hasn't picked dates yet, use a short placeholder
        // range purely to compute a "from" price - getHotelRooms() hits a
        // MANAGER/ADMIN-only endpoint and would 403 for guests here.
        const priceCheckIn = checkIn || defaultPriceCheckIn;
        const priceCheckOut = checkOut || defaultPriceCheckOut;

        const roomsByHotel = await Promise.all(
          results.map(async (hotel) => {
            try {
              const rooms: Room[] = await api.getAvailableRooms(hotel.id, priceCheckIn, priceCheckOut);
              return { hotel, rooms };
            } catch {
              // On a room-lookup failure, treat as "unknown": keep the hotel
              // visible only when no dates are in play, so we never show a
              // dated result we couldn't price.
              return { hotel, rooms: [] as Room[], failed: true };
            }
          })
        );

        const visible = roomsByHotel
          .filter(({ rooms, failed }) => {
            // With dates selected, a hotel with no available rooms is fully
            // booked for that range - hide it instead of rendering a
            // price-less card. Without dates, keep every hotel.
            if (hasDates) return rooms.length > 0;
            return !failed;
          })
          .map(({ hotel, rooms }) => {
            if (rooms.length > 0) {
              prices[hotel.id] = Math.min(...rooms.map((r) => r.pricePerNight));
            }
            return hotel;
          });

        if (!cancelled) {
          setHotels(visible);
          setPricesByHotel(prices);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Hotel list load failed", err);
          setHotels([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [city, checkIn, checkOut]);

  function handleSearch() {
    if (checkInInput && checkOutInput && checkInInput >= checkOutInput) {
      setDateError("Check-out date must be after check-in date.");
      return;
    }
    setDateError("");
    const params = new URLSearchParams(searchParams);
    if (cityInput) params.set("city", cityInput);
    else params.delete("city");
    if (checkInInput) params.set("checkIn", checkInInput);
    else params.delete("checkIn");
    if (checkOutInput) params.set("checkOut", checkOutInput);
    else params.delete("checkOut");
    setSearchParams(params);
  }

  return (
    <div className="container" style={{ padding: "40px 24px 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 8, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span className="eyebrow">
            {checkIn && checkOut ? `${checkIn} → ${checkOut}` : "Any dates"}
          </span>
          <h2 style={{ fontSize: "1.9rem", marginTop: 6 }}>
            {city ? `Hotels in ${city}` : "Search for hotels"}
          </h2>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap" }}>
          <input
            placeholder="Filter by city"
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            style={{
              border: "1px solid var(--line-strong)",
              borderRadius: 3,
              padding: "10px 12px",
              background: "var(--paper)",
              width: 160,
            }}
          />
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="hl-checkin" style={{ fontSize: "0.7rem" }}>Check-in</label>
            <input
              id="hl-checkin"
              type="date"
              min={today}
              value={checkInInput}
              onChange={(e) => setCheckInInput(e.target.value)}
              style={{
                border: "1px solid var(--line-strong)",
                borderRadius: 3,
                padding: "9px 10px",
                background: "var(--paper)",
              }}
            />
          </div>
          <div className="field" style={{ margin: 0 }}>
            <label htmlFor="hl-checkout" style={{ fontSize: "0.7rem" }}>Check-out</label>
            <input
              id="hl-checkout"
              type="date"
              min={checkInInput || today}
              value={checkOutInput}
              onChange={(e) => setCheckOutInput(e.target.value)}
              style={{
                border: "1px solid var(--line-strong)",
                borderRadius: 3,
                padding: "9px 10px",
                background: "var(--paper)",
              }}
            />
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSearch}>
            Update search
          </button>
        </div>
      </div>
      {dateError && <p className="error-text" style={{ marginTop: -4, marginBottom: 8 }}>{dateError}</p>}
      <div className="hairline" style={{ margin: "12px 0 4px" }} />

      {loading && <p style={{ padding: "24px 4px", color: "var(--ink-soft)" }}>Loading hotels…</p>}

      {!loading && hotels.length === 0 && city && (
        <div style={{ padding: "48px 4px", textAlign: "center" }}>
          <p style={{ fontSize: "1.05rem" }}>No hotels match “{city}”.</p>
          <p style={{ color: "var(--ink-soft)", marginTop: 6 }}>
            Try a different city, or clear the filter to see everything.
          </p>
        </div>
      )}

      {!loading && !city && (
        <div style={{ padding: "48px 4px", textAlign: "center" }}>
          <p style={{ fontSize: "1.05rem" }}>Enter a city above to search for hotels.</p>
        </div>
      )}

      {!loading &&
        hotels.map((hotel) => (
          <HotelCard key={hotel.id} hotel={hotel} fromPrice={pricesByHotel[hotel.id]} searchQuery={dateQuery} />
        ))}
    </div>
  );
}
