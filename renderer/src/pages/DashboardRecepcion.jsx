// src/pages/DashboardRecepcion.jsx
import { useEffect, useState } from "react";
import useReception from "../hooks/useReception";

export default function DashboardRecepcion() {
  const { createClient, registerEquipment, createOrder, equipmentExit } = useReception();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Ejemplo: cargar clientes
  const loadClients = async () => {
    try {
      const res = await fetch("http://localhost:4000/api/employee/receptionist/clients");
      if (!res.ok) throw new Error("Error al obtener clientes");
      const data = await res.json();
      setClients(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Recepción</h1>
      {loading ? (
        <p>Cargando clientes...</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id} className="p-2 border rounded">{c.nombre}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
