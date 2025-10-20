import React, { useState } from "react";
import { UserPlus } from "lucide-react";
import useFetch from "../../../hooks/useFetch";
import Swal from "sweetalert2";

const AdminForm = () => {
  const { fetchDataBackend } = useFetch();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    roleName: "", // inicialmente vacío
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🔹 Roles exactamente como SYSTEM_ROLES en backend
  const roles = [
    "Administrador",
    "Recepcionista",
    "Staff Técnico",
    "Staff Ventas",
  ];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.roleName) {
      Swal.fire("Error", "Debes seleccionar un rol", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetchDataBackend(
        "/admin/user/create",
        formData,
        "POST"
      );

      if (res.success) {
        Swal.fire("Éxito", "Usuario creado correctamente", "success");
        setFormData({
          username: "",
          email: "",
          password: "",
          roleName: "",
        });
      } else {
        Swal.fire("Error", res.message || "No se pudo crear el usuario", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error de conexión con el servidor", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 h-full">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
        <UserPlus className="text-blue-500" size={22} />
        Crear nuevo Usuario
      </h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          name="username"
          type="text"
          placeholder="Nombre de usuario"
          value={formData.username}
          onChange={handleChange}
          className="w-full border p-2 rounded focus:ring focus:ring-blue-200"
          required
        />
        <input
          name="email"
          type="email"
          placeholder="Correo electrónico"
          value={formData.email}
          onChange={handleChange}
          className="w-full border p-2 rounded focus:ring focus:ring-blue-200"
          required
        />
        <input
          name="password"
          type="password"
          placeholder="Contraseña"
          value={formData.password}
          onChange={handleChange}
          className="w-full border p-2 rounded focus:ring focus:ring-blue-200"
          required
        />
        <select
          name="roleName"
          value={formData.roleName}
          onChange={handleChange}
          className="w-full border p-2 rounded"
          required
        >
          <option value="" disabled>
            Selecciona un rol
          </option>
          {roles.map((role) => (
            <option key={role} value={role}>
              {role} {/* Ya viene en mayúsculas exactas como backend */}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={isSubmitting}
          className={`w-full py-2 rounded text-white transition ${
            isSubmitting ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSubmitting ? "Creando..." : "Crear Usuario"}
        </button>
      </form>
    </div>
  );
};

export default AdminForm;
