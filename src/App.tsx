import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import HotelList from "./pages/HotelList";
import HotelDetail from "./pages/HotelDetail";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MyStays from "./pages/MyStays";
import Profile from "./pages/Profile";
import BookingConfirmation from "./pages/BookingConfirmation";
import ManagerDashboard from "./pages/ManagerDashboard";
import AdminPanel from "./pages/AdminPanel";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main style={{ flex: 1 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/hotels" element={<HotelList />} />
            <Route path="/hotels/:id" element={<HotelDetail />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/profile"
              element={
                <ProtectedRoute allow={["GUEST", "MANAGER", "ADMIN"]}>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-stays"
              element={
                <ProtectedRoute allow={["GUEST", "MANAGER", "ADMIN"]}>
                  <MyStays />
                </ProtectedRoute>
              }
            />
            <Route
              path="/booking-confirmation/:id"
              element={
                <ProtectedRoute allow={["GUEST", "MANAGER", "ADMIN"]}>
                  <BookingConfirmation />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager"
              element={
                <ProtectedRoute allow={["MANAGER"]}>
                  <ManagerDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute allow={["ADMIN"]}>
                  <AdminPanel />
                </ProtectedRoute>
              }
            />
          </Routes>
        </main>
        <footer style={{ borderTop: "1px solid var(--line)", padding: "24px 0" }}>
          <div className="container" style={{ display: "flex", justifyContent: "space-between" }}>
            <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
              StayEase · Foundation build
            </span>
            <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
              No payment gateway · demo data only
            </span>
          </div>
        </footer>
      </BrowserRouter>
    </AuthProvider>
  );
}
