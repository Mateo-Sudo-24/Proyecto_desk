import { LogIn } from "lucide-react";
import Logo from "../assets/logo.png";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import storeAuth from "../context/storeAuth";
import { useState } from "react";
import useFetch from "../hooks/useFetch";
import Swal from "sweetalert2";

const LoginPage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { fetchDataBackend } = useFetch();
  const { setUser } = storeAuth(); // token + usuario completo

  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loginUser = async (dataForm) => {
    setErrorMessage("");
    setLoading(true);

    try {
      // Endpoint general que controla todos los roles
      const url = "/auth/login"; 
      const payload = {
        workId: dataForm.email,
        password: dataForm.password,
      };

      const response = await fetchDataBackend(url, payload, "POST", false);

      if (response?.success && response?.data) {
        // Guardamos token + info
        setUser({
          token: response.data.token,
          user: response.data.user,
        });

        // 🔹 Redirige según rol
        const roles = response.data.user.roles.map(r => r.toLowerCase());
        if (roles.includes("admin")) navigate("/dashboard"); // superadmin
        else if (roles.includes("recepcion")) navigate("/dashboard/recepcion");
        else if (roles.includes("tecnico")) navigate("/dashboard/tecnico");
        else if (roles.includes("ventas")) navigate("/dashboard/ventas");
        else navigate("/dashboard"); // fallback
      } else {
        Swal.fire("Error", response?.error || "Credenciales inválidas", "error");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
      Swal.fire("Error", error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo: logo gris/blanco */}
      <div className="hidden md:flex w-1/2 bg-gray-100 items-center justify-center">
        <img src={Logo} alt="Logo" className="w-3/4" />
      </div>

      {/* Lado derecho: formulario */}
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Iniciar sesión - Super Admin
          </h1>

          {errorMessage && (
            <p className="bg-red-100 text-red-800 p-2 rounded mb-4 text-center">
              {errorMessage}
            </p>
          )}

          <form className="space-y-5" onSubmit={handleSubmit(loginUser)}>
            {/* Work ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Work ID <span className="text-red-800">*</span>
              </label>
              <input
                type="text"
                placeholder="superadmin"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("email", { required: "El Work ID es obligatorio" })}
              />
              {errors.email && <p className="text-red-800">{errors.email.message}</p>}
            </div>

            {/* Contraseña */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña <span className="text-red-800">*</span>
              </label>
              <input
                type="password"
                placeholder="********"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("password", { required: "La contraseña es obligatoria" })}
              />
              {errors.password && <p className="text-red-800">{errors.password.message}</p>}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex items-center justify-center gap-2 text-white font-semibold py-2 rounded-md transition ${
                loading ? "bg-blue-300" : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              <LogIn size={18} /> {loading ? "Iniciando..." : "Iniciar Sesión"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              ¿Olvidaste tu contraseña?{" "}
              <a href="/forgot-password" className="text-blue-600 hover:underline">
                Recuperar
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
