import React, { useState } from "react";
import { X, Check } from "lucide-react";
import useFetch from "../../../../hooks/useFetch";

const EditRole = ({ role, onClose, onRoleUpdated }) => {
  const { fetchDataBackend } = useFetch();
  const [name, setName] = useState(role?.name || "");
  const [description, setDescription] = useState(role?.description || "");
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      alert("El nombre del rol no puede estar vacío");
      return;
    }

    setLoading(true);
    try {
      const res = await fetchDataBackend(
        "/admin/role/update",
        { roleId: role.roleId, name, description },
        "PUT"
      );
      if (res.success) {
        alert(res.message || "Rol actualizado exitosamente");
        onRoleUpdated(res.data.role); // Actualiza la lista en RoleList
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
        Editar Rol
      </h2>

      <p className="text-gray-600 text-sm mb-4">
        Actualiza el nombre y la descripción del rol seleccionado.
      </p>

      <div className="flex flex-col gap-2">
        <div>
          <label className="text-gray-700 text-sm font-medium">Nombre del rol:</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre del rol"
            className="border p-2 rounded w-full"
          />
        </div>

        <div>
          <label className="text-gray-700 text-sm font-medium">Descripción:</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descripción del rol"
            className="border p-2 rounded w-full"
            rows={3}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={loading}
          className="mt-2 w-full bg-green-500 hover:bg-green-600 text-white py-2 rounded flex items-center justify-center gap-2"
        >
          <Check size={16} /> Actualizar rol
        </button>
      </div>
    </div>
  );
};

export default EditRole;
