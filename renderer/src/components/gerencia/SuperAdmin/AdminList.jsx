import React, { useEffect, useState } from "react";
import { Users, Settings, Trash, Key, UserCheck, UserX, Loader2 } from "lucide-react";
import useFetch from "../../../hooks/useFetch";
import RoleManager from "./RoleManager";
import SetUserPassword from "./SetUserPassword";
import ToggleUserActive from "./ToggleUserActive";

const AdminList = ({ currentUserId }) => {
  const { fetchDataBackend } = useFetch();
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleManagerId, setRoleManagerId] = useState(null);
  const [setPasswordId, setSetPasswordId] = useState(null);
  const [toggleUserId, setToggleUserId] = useState(null);

  // Obtener lista de admins
  const getAdmins = async () => {
    setLoading(true);
    try {
      const res = await fetchDataBackend("/admin/user/list", null, "GET");
      if (res.success) setAdmins(res.data?.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getAdmins();
  }, [fetchDataBackend]);

  // Actualizar datos del usuario
  const handleUserUpdate = (userId, data) => {
    setAdmins(prev =>
      prev.map(u => (u.userId === userId ? { ...u, ...data } : u))
    );
  };

  // Actualizar roles del usuario
  const handleRolesUpdate = (userId, newRoles) => {
    setAdmins(prev =>
      prev.map(u => (u.userId === userId ? { ...u, roles: newRoles.map(r => ({ name: r })) } : u))
    );
  };

  // Eliminar usuario
  const handleDelete = async (user) => {
    if (user.userId === 1) return alert("No se puede eliminar al admin principal");
    if (user.userId === currentUserId) return alert("No puedes eliminarte a ti mismo");

    if (!window.confirm(`¿Seguro que deseas eliminar a ${user.username}?`)) return;

    try {
      const res = await fetchDataBackend("/admin/user/delete", { userId: user.userId }, "DELETE");
      if (res.success) {
        alert(res.message || "Usuario eliminado exitosamente");
        setAdmins(prev => prev.filter(u => u.userId !== user.userId));
      } else {
        alert(`Error: ${res.message}`);
      }
    } catch (err) {
      console.error(err);
      alert("Error de conexión al servidor");
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <Loader2 className="animate-spin text-blue-500" size={32} />
      <span className="ml-2 text-gray-600">Cargando administradores...</span>
    </div>
  );

  return (
    <div className="bg-white rounded-2xl shadow p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Users className="text-blue-500" size={22} /> Lista de Administradores
        </h2>
        <button
          onClick={getAdmins}
          className="px-2 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1"
        >
          <Loader2 size={16} className="animate-spin" /> Actualizar
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-gray-700 border">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 border-b">Usuario</th>
              <th className="text-left p-3 border-b">Correo</th>
              <th className="text-left p-3 border-b">Teléfono</th>
              <th className="text-left p-3 border-b">Rol</th>
              <th className="text-center p-3 border-b">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {admins.length > 0 ? admins.map(user => (
              <tr key={user.userId} className="hover:bg-gray-50">
                <td className="p-3 border-b">{user.username}</td>
                <td className="p-3 border-b">{user.email}</td>
                <td className="p-3 border-b">{user.phone || "-"}</td>
                <td className="p-3 border-b">{user.roles?.map(r => r.name).join(", ") || "Sin rol"}</td>
                <td className="text-center p-3 border-b flex justify-center gap-2">

                  {/* Gestionar roles */}
                  <button
                    onClick={() => setRoleManagerId(roleManagerId === user.userId ? null : user.userId)}
                    title="Gestionar roles"
                    className="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded flex items-center justify-center"
                  >
                    <Settings size={16} />
                  </button>

                  {/* Cambiar contraseña */}
                  <button
                    onClick={() => setSetPasswordId(setPasswordId === user.userId ? null : user.userId)}
                    title="Cambiar contraseña"
                    className="px-3 py-1 bg-purple-500 hover:bg-purple-600 text-white rounded flex items-center justify-center"
                  >
                    <Key size={16} />
                  </button>

                  {/* Activar/Desactivar */}
                  <button
                    onClick={() => setToggleUserId(toggleUserId === user.userId ? null : user.userId)}
                    title={user.active ? "Desactivar usuario" : "Reactivar usuario"}
                    className={`px-3 py-1 rounded text-white flex items-center justify-center ${
                      user.active ? "bg-green-500 hover:bg-green-600" : "bg-red-500 hover:bg-red-600"
                    }`}
                  >
                    {user.active ? <UserCheck size={16} /> : <UserX size={16} />}
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={() => handleDelete(user)}
                    title="Eliminar usuario"
                    className="px-3 py-1 bg-red-700 hover:bg-red-800 text-white rounded flex items-center justify-center"
                  >
                    <Trash size={16} />
                  </button>

                </td>
              </tr>
            )) : (
              <tr className="text-center text-gray-500">
                <td colSpan="5" className="p-4">No hay administradores registrados aún.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paneles dinámicos */}
      {roleManagerId && (
        <div className="mt-4">
          <RoleManager
            userId={roleManagerId}
            currentEmail={admins.find(u => u.userId === roleManagerId)?.email}
            currentPhone={admins.find(u => u.userId === roleManagerId)?.phone}
            currentRoles={admins.find(u => u.userId === roleManagerId)?.roles.map(r => r.name) || []}
            onUserUpdate={(data) => handleUserUpdate(roleManagerId, data)}
            onRolesUpdate={(newRoles) => handleRolesUpdate(roleManagerId, newRoles)}
            onClose={() => setRoleManagerId(null)}
          />
        </div>
      )}

      {setPasswordId && (
        <div className="mt-4">
          <SetUserPassword
            userId={setPasswordId}
            username={admins.find(u => u.userId === setPasswordId)?.username}
            onClose={() => setSetPasswordId(null)}
          />
        </div>
      )}

      {toggleUserId && (
        <div className="mt-4">
          <ToggleUserActive
            userId={toggleUserId}
            username={admins.find(u => u.userId === toggleUserId)?.username}
            active={admins.find(u => u.userId === toggleUserId)?.active}
            currentUserId={currentUserId}
            onStatusChange={(newStatus) => handleUserUpdate(toggleUserId, { active: newStatus })}
            onClose={() => setToggleUserId(null)}
          />
        </div>
      )}
    </div>
  );
};

export default AdminList;
