import { Mail } from "lucide-react";
import { useForm } from 'react-hook-form';
import  useFetch  from '../hooks/useFetch'

const ForgotPasswordPage = () => {

    const { register, handleSubmit, formState: { errors } } = useForm()
    const fetchDataBackend = useFetch()

    const sendMail = async (dataForm) => {
        const url = `${import.meta.env.VITE_BACKEND_URL}/recuperarpassword`
        await fetchDataBackend(url, dataForm,'POST')
    }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white shadow-xl rounded-2xl">
        <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          Recuperar Contraseña
        </h1>

        <p className="text-gray-600 text-center mb-6">
          Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form className="space-y-6" onSubmit={handleSubmit(sendMail)}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico <span className="text-red-800">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              placeholder="usuario@empresa.com"
              {...register("email", { required: "El correo electrónico es obligatorio" })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.email && <p className="text-red-800">{errors.email.message}</p>}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2 rounded-lg hover:bg-blue-700 transition"
          >
            <Mail size={18} />
            Enviar enlace
          </button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>
            ¿Ya recuerdas tu contraseña?{" "}
            <a href="/" className="text-blue-600 hover:underline">
              Iniciar sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
