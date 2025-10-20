import React, { useState } from "react";
import { Lock, X, Eye, EyeOff } from "lucide-react";
import useFetch from "../../../hooks/useFetch";

const SetUserPassword = ({ userId, username, onClose }) => {
  const { fetchDataBackend } = useFetch();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (newPassword.length < 8) {
      alert("La contraseña debe tener mínimo 8 caracteres");
      return;
    }
    if (newPassword !== confirmPassword) {
      alert("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchDataBackend(
        "/admin/user/set-password",
        { userId, newPassword },
        "POST"
      );
      if (res.success) {
        alert(res.message || "Contraseña actualizada exitosamente");
        onClose();
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
    <div className="bg-white rounded-2xl shadow p-6 h-full relative">
      {/* Cerrar panel */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
        title="Cerrar"
      >
        <X size={20} />
      </button>

      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-2">
        <Lock className="text-purple-500" size={22} /> Cambiar contraseña
      </h2>

      <p className="text-gray-600 text-sm mb-4">
        Aquí puedes establecer una nueva contraseña para <b>{username}</b>. 
        La contraseña debe tener mínimo 8 caracteres.
      </p>

      <div className="flex flex-col gap-3">
        {/* Nueva contraseña */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="border p-2 rounded w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-2 top-2 text-gray-500"
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Confirmar contraseña */}
        <div className="relative">
          <input
            type={showConfirm ? "text" : "password"}
            placeholder="Confirmar nueva contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="border p-2 rounded w-full pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirm((prev) => !prev)}
            className="absolute right-2 top-2 text-gray-500"
          >
            {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2"
        >
          <Lock size={16} /> Actualizar contraseña
        </button>
      </div>
    </div>
  );
};

export default SetUserPassword;
