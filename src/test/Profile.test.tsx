import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Profile from "../pages/Profile";
import { AuthProvider } from "../context/AuthContext";
import { ApiException } from "../services/api";
import * as api from "../services/api";
import type { User } from "../types";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return { ...actual, changePassword: vi.fn() };
});

function seedSession(user: User) {
  window.localStorage.setItem("stayease.session", JSON.stringify(user));
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Profile />
      </AuthProvider>
    </MemoryRouter>
  );
}

const guest: User = { id: "u1", email: "guest@stayease.com", name: "Guest One", role: "GUEST" };

describe("Profile page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows the logged-in user's account info", async () => {
    seedSession(guest);
    renderProfile();
    await waitFor(() => expect(screen.getByText("Guest One")).toBeInTheDocument());
    expect(screen.getByText("guest@stayease.com")).toBeInTheDocument();
    expect(screen.getByText("GUEST")).toBeInTheDocument();
  });

  it("rejects a new password shorter than 6 characters without calling the API", async () => {
    seedSession(guest);
    const user = userEvent.setup();
    renderProfile();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await user.type(screen.getByLabelText(/current password/i), "oldpass");
    await user.type(screen.getByLabelText(/^new password$/i), "short");
    await user.type(screen.getByLabelText(/confirm new password/i), "short");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it("rejects a mismatched confirmation without calling the API", async () => {
    seedSession(guest);
    const user = userEvent.setup();
    renderProfile();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await user.type(screen.getByLabelText(/current password/i), "oldpass");
    await user.type(screen.getByLabelText(/^new password$/i), "newpassword1");
    await user.type(screen.getByLabelText(/confirm new password/i), "newpassword2");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    expect(screen.getByText(/don't match/i)).toBeInTheDocument();
    expect(api.changePassword).not.toHaveBeenCalled();
  });

  it("calls changePassword and shows a success message on a valid submission", async () => {
    vi.mocked(api.changePassword).mockResolvedValueOnce(undefined);
    seedSession(guest);
    const user = userEvent.setup();
    renderProfile();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await user.type(screen.getByLabelText(/current password/i), "oldpass");
    await user.type(screen.getByLabelText(/^new password$/i), "newpassword1");
    await user.type(screen.getByLabelText(/confirm new password/i), "newpassword1");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => expect(api.changePassword).toHaveBeenCalledWith("oldpass", "newpassword1"));
    await waitFor(() => expect(screen.getByText("Password changed.")).toBeInTheDocument());
  });

  it("shows the backend's error when the current password is wrong", async () => {
    vi.mocked(api.changePassword).mockRejectedValueOnce(
      new ApiException("UNAUTHORIZED", "Current password is incorrect")
    );
    seedSession(guest);
    const user = userEvent.setup();
    renderProfile();
    await waitFor(() => screen.getByLabelText(/current password/i));

    await user.type(screen.getByLabelText(/current password/i), "wrongpass");
    await user.type(screen.getByLabelText(/^new password$/i), "newpassword1");
    await user.type(screen.getByLabelText(/confirm new password/i), "newpassword1");
    await user.click(screen.getByRole("button", { name: /change password/i }));

    await waitFor(() => expect(screen.getByText("Current password is incorrect")).toBeInTheDocument());
  });
});
