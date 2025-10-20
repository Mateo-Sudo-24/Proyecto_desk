// src/components/gerencia/SuperAdmin/Roles/DeleteRole.jsx
import React, { useState } from "react";
import { Trash } from "lucide-react";
import useFetch from "../../../../hooks/useFetch";

const DeleteRole = ({ role, onRoleDeleted }) => {
  const { fetchDataBackend } = useFetch();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`¿Seguro que deseas eliminar el rol "${role.name}"?`)) return;

    setLoading(true);
    try {
      const res = await fetchDataBackend("/admin/role/delete", { roleId: role.roleId }, "DELETE");
      if (res.success) {
        alert(res.message || "Rol eliminado exitosamente");
        onRoleDeleted(role.roleId, res.warning);
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
    <button
      onClick={handleDelete}
      disabled={loading}
      title="Eliminar rol"
      className={`px-3 py-1 rounded flex items-center justify-center text-white ${
        loading ? "bg-red-300 cursor-not-allowed" : "bg-red-700 hover:bg-red-800"
      }`}
    >
      <Trash size={16} />
    </button>
  );
};

export default DeleteRole;
