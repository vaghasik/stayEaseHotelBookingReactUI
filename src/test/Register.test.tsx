import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import Register from "../pages/Register";
import { AuthProvider } from "../context/AuthContext";
import { ApiException } from "../services/api";
import * as api from "../services/api";

vi.mock("../services/api", async () => {
  const actual = await vi.importActual<typeof api>("../services/api");
  return { ...actual, register: vi.fn() };
});

function renderRegister() {
  return render(
    <MemoryRouter>
      <AuthProvider>
        <Register />
      </AuthProvider>
    </MemoryRouter>
  );
}

describe("Register page", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("rejects a short password client-side without calling the API", async () => {
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "New Guest");
    await user.type(screen.getByLabelText(/email/i), "new@stayease.com");
    await user.type(screen.getByLabelText(/password/i), "short");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(screen.getByText(/at least 6 characters/i)).toBeInTheDocument();
    expect(api.register).not.toHaveBeenCalled();
  });

  it("shows the backend's error message when registration fails (e.g. duplicate email)", async () => {
    vi.mocked(api.register).mockRejectedValueOnce(new ApiException("CONFLICT", "Email already exists"));
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "New Guest");
    await user.type(screen.getByLabelText(/email/i), "dup@stayease.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() => expect(screen.getByText("Email already exists")).toBeInTheDocument());
  });

  it("calls register with the entered fields on valid submission", async () => {
    vi.mocked(api.register).mockResolvedValueOnce({
      id: "u1", email: "new@stayease.com", name: "New Guest", role: "GUEST",
    });
    const user = userEvent.setup();
    renderRegister();

    await user.type(screen.getByLabelText(/name/i), "New Guest");
    await user.type(screen.getByLabelText(/email/i), "new@stayease.com");
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /create account/i }));

    await waitFor(() =>
      expect(api.register).toHaveBeenCalledWith("new@stayease.com", "password123", "New Guest")
    );
  });
});
