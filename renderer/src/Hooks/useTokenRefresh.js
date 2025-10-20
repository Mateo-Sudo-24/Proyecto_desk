// src/hooks/useTokenRefresh.js
import { useEffect, useCallback } from "react";
import storeAuth from "../context/storeAuth";
import useFetch from "./useFetch";

export const useTokenRefresh = () => {
  const { fetchDataBackend } = useFetch();

  const refreshToken = useCallback(async () => {
    const token = storeAuth.getState().user?.token || localStorage.getItem("userToken");
    if (!token) return;

    try {
      const res = await fetchDataBackend("/auth/refresh", null, "POST", false);

      if (res?.success && res?.data?.token) {
        // Actualiza token en Zustand + localStorage
        storeAuth.getState().setUser({
          token: res.data.token,
          user: { ...storeAuth.getState().user }, // mantiene los demás datos
        });
        localStorage.setItem("userToken", res.data.token);
      } else {
        // Token inválido: cerrar sesión
        storeAuth.getState().clearAuth();
        localStorage.removeItem("userToken");
        window.location.href = "/login";
      }
    } catch (err) {
      console.error("Error al refrescar token:", err);
      storeAuth.getState().clearAuth();
      localStorage.removeItem("userToken");
      window.location.href = "/login";
    }
  }, [fetchDataBackend]);

  useEffect(() => {
    // Refresca cada 15 minutos
    const interval = setInterval(refreshToken, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshToken]);
};
