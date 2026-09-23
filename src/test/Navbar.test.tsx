import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Navbar from "../components/Navbar";
import { AuthProvider } from "../context/AuthContext";
import type { User } from "../types";

function seedSession(user: User) {
  window.localStorage.setItem("stayease.session", JSON.stringify(user));
}

function renderNavbar() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Navbar />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Navbar", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows Log in / Register when no one is logged in, and no role-only links", async () => {
    renderNavbar();
    await waitFor(() => expect(screen.getByText("Log in")).toBeInTheDocument());
    expect(screen.getByText("Register")).toBeInTheDocument();
    expect(screen.queryByText("Manager Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
    expect(screen.queryByText("My Stays")).not.toBeInTheDocument();
  });

  it("shows My Stays and the profile link for a logged-in guest, but not manager/admin links", async () => {
    seedSession({ id: "u1", email: "g@x.com", name: "Guest One", role: "GUEST" });
    renderNavbar();
    await waitFor(() => expect(screen.getByText(/Guest One/)).toBeInTheDocument());
    expect(screen.getByText("My Stays")).toBeInTheDocument();
    expect(screen.queryByText("Manager Dashboard")).not.toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows the Manager Dashboard link for a manager", async () => {
    seedSession({ id: "u1", email: "m@x.com", name: "Manager One", role: "MANAGER" });
    renderNavbar();
    await waitFor(() => expect(screen.getByText("Manager Dashboard")).toBeInTheDocument());
    expect(screen.getByText("My Stays")).toBeInTheDocument();
    expect(screen.queryByText("Admin")).not.toBeInTheDocument();
  });

  it("shows the Admin link for an admin", async () => {
    seedSession({ id: "u1", email: "a@x.com", name: "Admin One", role: "ADMIN" });
    renderNavbar();
    await waitFor(() => expect(screen.getByText("Admin")).toBeInTheDocument());
    expect(screen.queryByText("Manager Dashboard")).not.toBeInTheDocument();
  });

  it("clears the session on logout", async () => {
    seedSession({ id: "u1", email: "g@x.com", name: "Guest One", role: "GUEST" });
    renderNavbar();
    await waitFor(() => expect(screen.getByText("Log out")).toBeInTheDocument());

    fireEvent.click(screen.getByText("Log out"));

    await waitFor(() => expect(screen.getByText("Log in")).toBeInTheDocument());
    expect(window.localStorage.getItem("stayease.session")).toBeNull();
  });
});
