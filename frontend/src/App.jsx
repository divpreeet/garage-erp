import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Customers from "./pages/Customers";
import Vehicles from "./pages/Vehicles";
import Estimates from "./pages/Estimates";
import Invoices from "./pages/Invoices";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const navigate = useNavigate();

  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);

  const handleLogout = () => {
    setToken("");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {token && <Navbar onLogout={handleLogout} />}
      <Routes>
        <Route path="/login" element={<Login setToken={setToken} />} />
        <Route path="/customers" element={<ProtectedRoute token={token}><Customers token={token} /></ProtectedRoute>} />
        <Route path="/vehicles" element={<ProtectedRoute token={token}><Vehicles token={token} /></ProtectedRoute>} />
        <Route path="/estimates" element={<ProtectedRoute token={token}><Estimates token={token} /></ProtectedRoute>} />
        <Route path="/invoices" element={<ProtectedRoute token={token}><Invoices token={token} /></ProtectedRoute>} />
        <Route path="/" element={<Navigate to={token ? "/customers" : "/login"} />} />
        <Route path="*" element={<Navigate to={token ? "/customers" : "/login"} />} />
      </Routes>
    </div>
  );
}

export default App;
