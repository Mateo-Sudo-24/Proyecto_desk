import axios from "axios";
import { useCallback } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";
import storeAuth from "../context/storeAuth"; // zustand

const MySwal = withReactContent(Swal);
const BASE_URL = import.meta.env.VITE_API_DESK || "http://localhost:4000/api/";

function useFetch() {
  const fetchDataBackend = useCallback(
    async (endpoint, data = null, method = "GET", showModals = true) => {
      // 🔹 Obtener token desde Zustand o fallback a localStorage
      const token = storeAuth.getState().user?.token || localStorage.getItem("userToken");

      const url = endpoint.startsWith("/")
        ? `${BASE_URL}${endpoint.substring(1)}`
        : `${BASE_URL}${endpoint}`;

      const isFormData = data instanceof FormData;

      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(!isFormData ? { "Content-Type": "application/json" } : {}),
      };

      if (showModals) {
        await MySwal.fire({
          title: "Procesando solicitud...",
          text: "Por favor espera",
          allowOutsideClick: false,
          didOpen: () => MySwal.showLoading(),
        });
      }

      try {
        const response = await axios({
          method: method.toUpperCase(),
          url,
          headers,
          ...(method.toUpperCase() !== "GET" && data
            ? { data: isFormData ? data : JSON.stringify(data) }
            : {}),
        });

        if (showModals) {
          MySwal.close();
          await MySwal.fire({
            icon: "success",
            title: "¡Éxito!",
            text: response?.data?.msg || response?.data?.message || "Operación completada correctamente",
            confirmButtonText: "OK",
            backdrop: true,
          });
        }

        return response.data;
      } catch (error) {
        if (showModals) MySwal.close();

        const errorMsg =
          error?.response?.data?.msg ||
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          error?.message ||
          "Error desconocido";

        if (showModals) {
          await MySwal.fire({
            icon: "error",
            title: "Error",
            text: errorMsg,
            confirmButtonText: "Entendido",
            backdrop: true,
          });
        }

        throw new Error(errorMsg);
      }
    },
    [] // ya no depende del contexto
  );

  return { fetchDataBackend };
}

export default useFetch;
