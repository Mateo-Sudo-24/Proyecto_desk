import React, { useState } from "react";
import { UserCheck, UserX, X } from "lucide-react";
import useFetch from "../../../hooks/useFetch";

const ToggleUserActive = ({ userId, username, active, onStatusChange, onClose, currentUserId }) => {
  const { fetchDataBackend } = useFetch();
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    // Validaciones
    if (userId === 1) {
      alert("No se puede desactivar al admin principal");
      return;
    }
    if (userId === currentUserId) {
      alert("No puedes desactivarte a ti mismo");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchDataBackend("/admin/user/update", {
        userId,
        active: !active,
      }, "PUT");

      if (res.success) {
        alert(res.message || `Usuario ${!active ? "activado" : "desactivado"} exitosamente`);
        onStatusChange(!active);
      } else {
        alert(`Error: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-4 h-full relative">
      {/* Cerrar panel */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        title="Cerrar"
      >
        <X size={20} />
      </button>

      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
        {active ? <UserX className="text-red-500" size={22} /> : <UserCheck className="text-green-500" size={22} />}
        {active ? "Desactivar Usuario" : "Reactivar Usuario"}
      </h2>

      <p className="text-gray-600 mb-4">
        {active
          ? `Vas a desactivar al usuario: ${username}.`
          : `Vas a reactivar al usuario: ${username}.`}
      </p>

      <button
        onClick={handleToggle}
        disabled={loading}
        className={`w-full py-2 rounded text-white ${
          active ? "bg-red-500 hover:bg-red-600" : "bg-green-500 hover:bg-green-600"
        }`}
      >
        {active ? "Desactivar" : "Reactivar"}
      </button>
    </div>
  );
};

export default ToggleUserActive;
