import type { CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <header
      style={{
        borderBottom: "1px solid var(--line)",
        background: "var(--linen)",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}
    >
      <div
        className="container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 68,
        }}
      >
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontFamily: "var(--display)", fontSize: "1.4rem", fontWeight: 700, color: "var(--ink)" }}>
            StayEase
          </span>
          <span className="eyebrow" style={{ fontSize: "0.62rem" }}>Stays, sorted</span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <Link to="/hotels" style={navLink}>Browse</Link>

          {user && (
            <Link to="/my-stays" style={navLink}>My Stays</Link>
          )}
          {user?.role === "MANAGER" && (
            <Link to="/manager" style={navLink}>Manager Dashboard</Link>
          )}
          {user?.role === "ADMIN" && (
            <Link to="/admin" style={navLink}>Admin</Link>
          )}

          {user ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Link to="/profile" className="mono" style={{ fontSize: "0.8rem", color: "var(--ink-soft)", textDecoration: "none" }}>
                {user.name} · {user.role}
              </Link>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
              >
                Log out
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 10 }}>
              <Link to="/login" className="btn btn-ghost btn-sm">Log in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Register</Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

const navLink: CSSProperties = {
  textDecoration: "none",
  color: "var(--ink)",
  fontSize: "0.92rem",
  fontWeight: 500,
};
