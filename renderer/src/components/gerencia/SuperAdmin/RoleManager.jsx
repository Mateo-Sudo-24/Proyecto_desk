import React, { useState } from "react";
import { ShieldCheck, X, Plus, Trash } from "lucide-react";
import useFetch from "../../../hooks/useFetch";

const RoleManager = ({ userId, currentEmail, currentPhone, currentRoles, onUserUpdate, onClose }) => {
  const { fetchDataBackend } = useFetch();
  const [email, setEmail] = useState(currentEmail || "");
  const [phone, setPhone] = useState(currentPhone || "");
  const [roles, setRoles] = useState(currentRoles || []);
  const [newRole, setNewRole] = useState("");
  const [loading, setLoading] = useState(false);

  const availableRoles = ["Administrador", "Recepcionista", "Staff Técnico", "Staff Ventas"];

  // Guardar correo y teléfono
  const saveUser = async () => {
    setLoading(true);
    try {
      const res = await fetchDataBackend("/admin/user/update", { userId, email, phone }, "PUT");
      if (res.success) {
        onUserUpdate({ email, phone });
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

  // Agregar rol
  const addRole = async () => {
    if (!newRole || roles.includes(newRole)) return;
    try {
      const res = await fetchDataBackend("/admin/user/assign-role", { userId, roleName: newRole, action: "add" }, "POST");
      if (res.success) {
        setRoles((prev) => [...prev, newRole]);
        setNewRole("");
      } else {
        alert(`Error: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al servidor");
    }
  };

  // Remover rol
  const removeRole = async (role) => {
    try {
      const res = await fetchDataBackend("/admin/user/assign-role", { userId, roleName: role, action: "remove" }, "POST");
      if (res.success) {
        setRoles((prev) => prev.filter((r) => r !== role));
      } else {
        alert(`Error: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al servidor");
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
        <ShieldCheck className="text-purple-500" size={22} /> Gestión de Roles
      </h2>

      <p className="text-gray-600 text-sm mb-4">
        Aquí puedes actualizar el correo, teléfono y los roles asignados al usuario.
      </p>

      {/* Correo y teléfono */}
      <div className="flex flex-col gap-2 mb-4">
        <div>
          <label className="text-gray-700 text-sm font-medium">Correo:</label>
          <input
            type="email"
            placeholder="Ingrese correo del usuario"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="border p-1 rounded w-full"
          />
        </div>
        <div>
          <label className="text-gray-700 text-sm font-medium">Teléfono:</label>
          <input
            type="text"
            placeholder="Ingrese teléfono del usuario"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="border p-1 rounded w-full"
          />
        </div>
        <button
          onClick={saveUser}
          disabled={loading}
          className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded"
        >
          Guardar datos
        </button>
      </div>

      {/* Roles */}
      <div className="mt-4">
        <p className="text-gray-600 text-sm mb-1">Roles asignados actualmente:</p>
        <div className="flex flex-wrap gap-2 mb-2">
          {roles.map((r) => (
            <div key={r} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
              <span>{r}</span>
              <button
                onClick={() => removeRole(r)}
                className="text-red-500 hover:text-red-700"
                title="Eliminar rol"
              >
                <Trash size={14} />
              </button>
            </div>
          ))}
        </div>

        <p className="text-gray-600 text-sm mb-1">Agregar nuevo rol:</p>
        <div className="flex gap-2">
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="border p-1 rounded w-full"
          >
            <option value="">Seleccione un rol</option>
            {availableRoles.map((r) => (
              <option key={r} value={r} disabled={roles.includes(r)}>
                {r} {roles.includes(r) ? "(Asignado)" : ""}
              </option>
            ))}
          </select>
          <button
            onClick={addRole}
            className="bg-purple-500 hover:bg-purple-600 text-white px-3 rounded flex items-center gap-1"
          >
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleManager;
