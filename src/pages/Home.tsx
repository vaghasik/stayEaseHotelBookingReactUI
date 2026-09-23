import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { loadSearchPrefs, saveSearchPrefs } from "../utils/searchPrefs";

export default function Home() {
  const navigate = useNavigate();
  const remembered = loadSearchPrefs();
  const [city, setCity] = useState(remembered.city ?? "");
  const [checkIn, setCheckIn] = useState(remembered.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(remembered.checkOut ?? "");
  const [error, setError] = useState("");

  const today = new Date().toISOString().split("T")[0];

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (checkIn && checkOut && checkIn >= checkOut) {
      setError("Check-out date must be after check-in date.");
      return;
    }
    setError("");
    saveSearchPrefs({ city, checkIn, checkOut });
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    navigate(`/hotels?${params.toString()}`);
  }

  return (
    <div>
      <section
        style={{
          background: `linear-gradient(180deg, rgba(22,33,31,0.55), rgba(22,33,31,0.65)), url('https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600&q=80') center/cover`,
          minHeight: 460,
          display: "flex",
          alignItems: "center",
        }}
      >
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 420px",
            gap: 40,
            alignItems: "center",
            width: "100%",
          }}
        >
          <div>
            <p className="eyebrow" style={{ color: "var(--brass-light)" }}>
              StayEase · Foundation
            </p>
            <h1 style={{ fontSize: "3rem", color: "#fff", lineHeight: 1.08, marginTop: 10 }}>
              Finding a room
              <br />
              should take minutes.
            </h1>
            <p style={{ color: "rgba(255,255,255,0.82)", fontSize: "1.05rem", marginTop: 16, maxWidth: 440 }}>
              Search by city and dates, compare rooms side by side, and walk away
              with a confirmed booking — no phone calls required.
            </p>
          </div>

          {/* Signature element: the search card as a torn ticket stub */}
          <form
            onSubmit={handleSubmit}
            className="card"
            style={{
              padding: "26px 26px 22px",
              boxShadow: "0 14px 40px rgba(22,33,31,0.28)",
              position: "relative",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="eyebrow">Search stays</span>
              <span className="mono" style={{ fontSize: "0.68rem", color: "var(--ink-soft)" }}>
                No. {new Date().getFullYear()}-01
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              <div className="field">
                <label htmlFor="city">City</label>
                <input
                  id="city"
                  placeholder="e.g. Goa"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div className="field">
                  <label htmlFor="checkin">Check-in</label>
                  <input
                    id="checkin"
                    type="date"
                    min={today}
                    value={checkIn}
                    onChange={(e) => setCheckIn(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="checkout">Check-out</label>
                  <input
                    id="checkout"
                    type="date"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
              </div>
              {error && <span className="error-text">{error}</span>}
            </div>

            <div className="perforation" style={{ margin: "20px -26px" }}>
              <span className="ticket-notch" style={{ left: -10 }} />
              <span className="ticket-notch" style={{ right: -10 }} />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%" }}>
              Search hotels
            </button>
          </form>
        </div>
      </section>

      <section className="container" style={{ padding: "56px 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 32 }}>
          {[
            {
              n: "01",
              title: "Search",
              body: "Enter a city and your dates to see hotels with real availability.",
            },
            {
              n: "02",
              title: "Compare",
              body: "Open a hotel to see room types, pricing, and amenities side by side.",
            },
            {
              n: "03",
              title: "Confirm",
              body: "Book in one step and get a booking reference you can cancel anytime.",
            },
          ].map((step) => (
            <div key={step.n}>
              <span className="mono" style={{ color: "var(--brass)", fontSize: "0.85rem" }}>
                {step.n}
              </span>
              <h3 style={{ fontSize: "1.2rem", marginTop: 8 }}>{step.title}</h3>
              <p style={{ color: "var(--ink-soft)", marginTop: 8, fontSize: "0.92rem" }}>{step.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
