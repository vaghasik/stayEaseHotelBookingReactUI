import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ProtectedRoute from "../components/ProtectedRoute";
import { AuthProvider } from "../context/AuthContext";
import type { User } from "../types";

function renderProtected(allow: User["role"][]) {
  return render(
    <MemoryRouter initialEntries={["/secret"]}>
      <AuthProvider>
        <Routes>
          <Route
            path="/secret"
            element={
              <ProtectedRoute allow={allow}>
                <div>Secret content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
          <Route path="/" element={<div>Home page</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function seedSession(user: User) {
  window.localStorage.setItem("stayease.session", JSON.stringify(user));
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("redirects to /login when no one is logged in", async () => {
    renderProtected(["GUEST"]);
    await waitFor(() => expect(screen.getByText("Login page")).toBeInTheDocument());
  });

  it("redirects to / when the logged-in user's role isn't allowed", async () => {
    seedSession({ id: "u1", email: "g@x.com", name: "Guest", role: "GUEST" });
    renderProtected(["MANAGER", "ADMIN"]);
    await waitFor(() => expect(screen.getByText("Home page")).toBeInTheDocument());
  });

  it("renders the protected content when the role is allowed", async () => {
    seedSession({ id: "u1", email: "m@x.com", name: "Manager", role: "MANAGER" });
    renderProtected(["MANAGER", "ADMIN"]);
    await waitFor(() => expect(screen.getByText("Secret content")).toBeInTheDocument());
  });

  it("allows any of several permitted roles", async () => {
    seedSession({ id: "u1", email: "a@x.com", name: "Admin", role: "ADMIN" });
    renderProtected(["GUEST", "MANAGER", "ADMIN"]);
    await waitFor(() => expect(screen.getByText("Secret content")).toBeInTheDocument());
  });
});
