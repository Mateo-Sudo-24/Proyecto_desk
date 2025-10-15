import { LogIn, MailCheck } from "lucide-react";
import Logo from "../assets/logo.png";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import useFetch from "../hooks/useFetch";
import storeAuth from "../context/storeAuth";
import { useState } from "react";

const LoginPage = () => {
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { fetchDataBackend } = useFetch();
  const { setRol } = storeAuth();

  const [modoLogin, setModoLogin] = useState("password"); // "password" o "otp"

  // 🔹 Login normal (usuario + contraseña)
  const loginUser = async (dataForm) => {
    try {
      const url = "/client-auth/login";
      const payload = {
        email: dataForm.email,
        password: dataForm.password,
        role: dataForm.role,
      };

      const response = await fetchDataBackend(url, payload, "POST", false);

      if (response?.success && response?.data) {
        if (dataForm.role) setRol(dataForm.role);
        navigate("/dashboard"); // redirige después del login normal
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error.message);
    }
  };

  // 🔹 Login con OTP (solicita código por correo)
  const solicitarOTP = async (dataForm) => {
    try {
      const url = "/client-auth/login-otp";
      const payload = {
        email: dataForm.email,
        role: dataForm.role,
      };

      const response = await fetchDataBackend(url, payload, "POST", false);

      if (response?.success) {
        if (dataForm.role) setRol(dataForm.role);
        navigate("/otp"); // redirige a la pantalla para ingresar OTP
      }
    } catch (error) {
      console.error("Error al enviar OTP:", error.message);
    }
  };

  // 🔹 Cambiar entre modos limpia el formulario
  const cambiarModo = (modo) => {
    setModoLogin(modo);
    reset();
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo - Logo */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br from-blue-600 to-blue-800 items-center justify-center">
        <img src={Logo} alt="Logo" className="w-3/4" />
      </div>

      {/* Lado derecho - Formulario */}
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-6 text-center">
            Iniciar sesión
          </h1>

          {/* 🔸 Selector de modo */}
          <div className="flex justify-center gap-2 mb-6">
            <button
              type="button"
              onClick={() => cambiarModo("password")}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 border transition ${
                modoLogin === "password"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <LogIn size={16} />
              Login con Contraseña
            </button>

            <button
              type="button"
              onClick={() => cambiarModo("otp")}
              className={`px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 border transition ${
                modoLogin === "otp"
                  ? "bg-green-600 text-white border-green-600"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100"
              }`}
            >
              <MailCheck size={16} />
              Login con Código OTP
            </button>
          </div>

          <form
            className="space-y-5"
            onSubmit={handleSubmit(modoLogin === "password" ? loginUser : solicitarOTP)}
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol <span className="text-red-800">*</span>
              </label>
              <select
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("role", { required: "Selecciona un rol" })}
              >
                <option value="">--Selecciona--</option>
                <option value="gerencia">Gerencia</option>
                <option value="recepcion">Recepción</option>
                <option value="tecnico">Técnico</option>
                <option value="ventas">Área de Ventas</option>
              </select>
              {errors.role && <p className="text-red-800">{errors.role.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico <span className="text-red-800">*</span>
              </label>
              <input
                type="email"
                placeholder="usuario@empresa.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                {...register("email", { required: "El correo es obligatorio" })}
              />
              {errors.email && <p className="text-red-800">{errors.email.message}</p>}
            </div>

            {/* Solo se muestra la contraseña si el modo es "password" */}
            {modoLogin === "password" && (
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
                {errors.password && (
                  <p className="text-red-800">{errors.password.message}</p>
                )}
              </div>
            )}

            <button
              type="submit"
              className={`w-full flex items-center justify-center gap-2 text-white font-semibold py-2 rounded-md transition ${
                modoLogin === "password"
                  ? "bg-blue-600 hover:bg-blue-700"
                  : "bg-green-600 hover:bg-green-700"
              }`}
            >
              {modoLogin === "password" ? (
                <>
                  <LogIn size={18} /> Iniciar Sesión
                </>
              ) : (
                <>
                  <MailCheck size={18} /> Enviar Código OTP
                </>
              )}
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
