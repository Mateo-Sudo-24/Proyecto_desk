import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Mail } from "lucide-react";
import useFetch from "../hooks/useFetch";
import storeAuth from "../context/storeAuth";
import Logo from "../assets/logo.png";

const OTPPage = () => {
  const navigate = useNavigate();
  const { fetchDataBackend } = useFetch();
  const { rol } = storeAuth();
  const { register, handleSubmit, formState: { errors } } = useForm();

  const verificarOTP = async (dataForm) => {
    try {
      const url = "/client-auth/verify-otp";
      const payload = {
        email: dataForm.email,
        otp: dataForm.otp,
        role: rol || dataForm.role,
      };

      const response = await fetchDataBackend(url, payload, "POST", false);

      if (response?.success) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error al verificar OTP:", error.message);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Lado izquierdo - Logo */}
      <div className="hidden md:flex w-1/2 bg-gradient-to-br items-center justify-center">
        <img src={Logo} alt="Logo" className="w-3/4" />
      </div>

      {/* Lado derecho - Formulario OTP */}
      <div className="flex flex-1 items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-lg">
          <div className="flex flex-col items-center mb-6">
            <ShieldCheck size={50} className="text-green-600 mb-2" />
            <h1 className="text-2xl font-bold text-gray-800 text-center">
              Verificar Código OTP
            </h1>
            <p className="text-gray-500 text-sm text-center mt-2">
              Ingresa el código de 6 dígitos enviado a tu correo electrónico.
            </p>
          </div>

          <form onSubmit={handleSubmit(verificarOTP)} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo Electrónico <span className="text-red-800">*</span>
              </label>
              <div className="flex items-center border border-gray-300 rounded-md px-3 py-2">
                <Mail className="text-gray-400 mr-2" size={18} />
                <input
                  type="email"
                  placeholder="usuario@empresa.com"
                  className="w-full outline-none"
                  {...register("email", { required: "El correo es obligatorio" })}
                />
              </div>
              {errors.email && <p className="text-red-800">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Código OTP <span className="text-red-800">*</span>
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="••••••"
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-green-500"
                {...register("otp", {
                  required: "El código es obligatorio",
                  pattern: {
                    value: /^[0-9]{6}$/,
                    message: "El código debe tener 6 dígitos",
                  },
                })}
              />
              {errors.otp && <p className="text-red-800">{errors.otp.message}</p>}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-semibold py-2 rounded-md hover:bg-green-700 transition"
            >
              <ShieldCheck size={18} />
              Verificar Código
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-500">
            <p>
              ¿No recibiste el código?{" "}
              <a href="/login" className="text-blue-600 hover:underline">
                Reenviar
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPPage;
