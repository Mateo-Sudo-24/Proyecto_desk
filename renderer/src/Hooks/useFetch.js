import axios from "axios";
import { useCallback } from "react";
import Swal from "sweetalert2";
import withReactContent from "sweetalert2-react-content";

const MySwal = withReactContent(Swal);

// Solo una URL fija al backend en puerto 4000 o la variable de entorno
const BASE_URL = import.meta.env.VITE_API_DESK ;

function useFetch() {
  const fetchDataBackend = useCallback(
    async (
      endpoint,
      data = null,
      method = "GET",
      showModals = true
    ) => {
      const url = endpoint.startsWith("/")
        ? `${BASE_URL}${endpoint.slice(1)}`
        : `${BASE_URL}${endpoint}`;

      const token = localStorage.getItem("token");
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
          ...(method.toUpperCase() !== "GET" && data ? { data } : {}),
        });

        if (showModals) {
          MySwal.close();
          await MySwal.fire({
            icon: "success",
            title: "¡Éxito!",
            text: response?.data?.msg || "Operación completada correctamente",
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
    []
  );

  return { fetchDataBackend };
}

export default useFetch;
