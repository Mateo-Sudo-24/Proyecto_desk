// src/hooks/useReception.js
import { useCallback } from "react";
import useFetch from "./useFetch";

const useReception = () => {
  const { fetchDataBackend } = useFetch();

  // GET: lista de clientes
  const fetchReceptionData = useCallback(
    async (endpoint, showModals = false) => {
      try {
        const data = await fetchDataBackend(endpoint, null, "GET", showModals);
        return data;
      } catch (error) {
        console.error("Error fetchReceptionData:", error);
        return [];
      }
    },
    [fetchDataBackend]
  );

  // POST: crear cliente
  const createClient = async (clientData, showModals = true) => {
    return await fetchDataBackend(
      "/employee/receptionist/client", // **sin /api al inicio**
      clientData,
      "POST",
      showModals
    );
  };

  // POST: registrar equipo
  const registerEquipment = async (equipmentData, showModals = true) => {
    return await fetchDataBackend(
      "/employee/receptionist/equipment", // **sin /api al inicio**
      equipmentData,
      "POST",
      showModals
    );
  };

  return {
    fetchReceptionData,
    createClient,
    registerEquipment,
  };
};

export default useReception;
