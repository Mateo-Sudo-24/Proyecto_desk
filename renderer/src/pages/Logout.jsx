import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useAuthStore from "../context/storeAuth"; // ← tu store real

export default function Logout() {
  const navigate = useNavigate();
  const { clearAuth } = useAuthStore(); // usamos tu función del store

  useEffect(() => {
    // 🔹 Limpieza del estado global (store)
    clearAuth();

    // 🔹 Limpieza del localStorage persistido (por seguridad extra)
    localStorage.removeItem("auth-token");

    // 🔹 Redirección al login
    navigate("/login", { replace: true });
  }, [clearAuth, navigate]);

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <p className="text-gray-600 text-lg">Cerrando sesión...</p>
    </div>
  );
}
