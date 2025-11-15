import axios from "axios";

// Detectar entorno (Vite lo inyecta automáticamente)
const isDev = import.meta.env.MODE === "development";

// Base URL de tu backend
// Ajusta el puerto según el que use tu backend Express
export const API_BASE_URL = isDev
  ? "http://localhost:4000/api" // 🔧 Durante desarrollo (Electron + React)
  : "http://127.0.0.1:4000/api"; // ⚙️ En producción (MSI o build final)

// Crear instancia de Axios
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  withCredentials: true, // necesario si usas sesiones (clientes)
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Interceptor de solicitud (adjunta token JWT) ---
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// --- Interceptor de respuesta (maneja errores) ---
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response) {
      const { status } = error.response;
      if (status === 401) {
        console.warn("⚠️ Sesión expirada. Redirigiendo al login...");
        localStorage.removeItem("token");
      }
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

export default api;
