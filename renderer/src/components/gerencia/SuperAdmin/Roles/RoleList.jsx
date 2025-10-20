import React, { useEffect, useState } from "react";
import { Loader2, Edit, RefreshCw } from "lucide-react";
import useFetch from "../../../../hooks/useFetch";
import EditRole from "./EditRole";
import DeleteRole from "./DeleteRole";

const RoleList = () => {
  const { fetchDataBackend } = useFetch();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editRoleId, setEditRoleId] = useState(null);

  const getRoles = async () => {
    setLoading(true);
    try {
      const res = await fetchDataBackend("/admin/role/list", null, "GET");
      if (res.success) setRoles(res.data?.roles || []);
    } catch (err) {
      console.error(err);
      alert("Error cargando la lista de roles");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getRoles();
  }, [fetchDataBackend]);

  const handleRoleUpdate = (updatedRole) => {
    setRoles((prev) =>
      prev.map((r) =>
        r.roleId === updatedRole.roleId ? { ...r, ...updatedRole } : r
      )
    );
    setEditRoleId(null);
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-blue-500" size={32} />
        <span className="ml-2 text-gray-600">Cargando roles...</span>
      </div>
    );

  return (
    <div className="bg-white rounded-2xl shadow p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Lista de Roles</h2>
        <button
          onClick={getRoles}
          title="Actualizar lista de roles"
          disabled={loading}
          className={`${
            loading ? "bg-blue-300 cursor-not-allowed" : "bg-blue-500 hover:bg-blue-600"
          } text-white px-3 py-1 rounded flex items-center gap-1`}
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-700 border">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 border-b">Nombre</th>
              <th className="text-left p-3 border-b">Descripción</th>
              <th className="text-center p-3 border-b">Usuarios</th>
              <th className="text-center p-3 border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {roles.length > 0 ? (
              roles.map((role) => (
                <tr key={role.roleId} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{role.name}</td>
                  <td className="p-3 border-b">{role.description}</td>
                  <td className="text-center p-3 border-b">{role.usersCount}</td>
                  <td className="text-center p-3 border-b flex justify-center gap-2">
                    {/* Editar rol */}
                    <button
                      onClick={() =>
                        setEditRoleId(editRoleId === role.roleId ? null : role.roleId)
                      }
                      title="Editar rol"
                      className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded flex items-center justify-center"
                    >
                      <Edit size={16} />
                    </button>

                    {/* Eliminar rol */}
                    <DeleteRole
                      role={role}
                      onRoleDeleted={(deletedRoleId, warning) => {
                        setRoles((prev) => prev.filter((r) => r.roleId !== deletedRoleId));
                        if (editRoleId === deletedRoleId) setEditRoleId(null);
                        if (warning) alert(warning); // Muestra advertencia si hay usuarios asignados
                      }}
                    />
                  </td>
                </tr>
              ))
            ) : (
              <tr className="text-center text-gray-500">
                <td colSpan="4" className="p-4">
                  No hay roles registrados aún.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Panel Edit Role */}
      {editRoleId && (
        <div className="mt-4">
          <EditRole
            role={roles.find((r) => r.roleId === editRoleId)}
            onClose={() => setEditRoleId(null)}
            onRoleUpdated={handleRoleUpdate}
          />
        </div>
      )}
    </div>
  );
};

export default RoleList;
