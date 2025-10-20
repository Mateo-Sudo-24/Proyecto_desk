// src/components/gerencia/SuperAdmin/CreateRole.jsx
import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import useFetch from "../../../../hooks/useFetch";

const CreateRole = ({ onRoleCreated }) => {
  const { fetchDataBackend } = useFetch();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateRole = async () => {
    if (!name.trim()) return alert("El nombre del rol es obligatorio");
    if (!description.trim()) return alert("La descripción es obligatoria");

    setLoading(true);
    try {
      const res = await fetchDataBackend(
        "/admin/role/create",
        { name, description },
        "POST"
      );
      if (res.success) {
        alert(res.message || "Rol creado exitosamente");
        setName("");
        setDescription("");
        if (onRoleCreated) onRoleCreated(res.data.role);
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
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <Plus className="text-purple-500" size={22} /> Crear Nuevo Rol
      </h2>

      <div className="flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nombre del rol"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <textarea
          placeholder="Descripción del rol"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 rounded w-full"
        />
        <button
          onClick={handleCreateRole}
          disabled={loading}
          className="mt-2 w-full bg-purple-500 hover:bg-purple-600 text-white py-2 rounded flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Crear Rol
        </button>
      </div>
    </div>
  );
};

export default CreateRole;
