// renderer/src/components/tecnico/TechDashboardStates.jsx
import React, { useEffect, useState } from "react";
import useFetch from "../../Hooks/useFetch";
import { CgSpinner } from "react-icons/cg";

const TechDashboardStates = () => {
  const { fetchDataBackend } = useFetch();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await fetchDataBackend(
          "/employee/technical/dashboard",
          null,
          "GET",
          false
        );
        if (response.success) {
          setDashboard(response.data);
        }
      } catch (err) {
        console.error("Error al cargar dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32 col-span-full">
        <CgSpinner className="animate-spin text-3xl text-gray-500" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <p className="text-center text-gray-500 col-span-full">
        No se pudo cargar el dashboard.
      </p>
    );
  }

  const stats = [
    { label: "Órdenes asignadas", value: dashboard.assignedOrders, color: "bg-blue-500" },
    { label: "Órdenes en progreso", value: dashboard.ordersInProgress, color: "bg-yellow-500" },
    { label: "Completadas hoy", value: dashboard.completedToday, color: "bg-green-500" },
    { label: "Completadas esta semana", value: dashboard.completedThisWeek, color: "bg-indigo-500" },
    { label: "Tiempo promedio reparación", value: dashboard.avgRepairTime, color: "bg-purple-500" },
    { label: "Diagnósticos pendientes", value: dashboard.pendingDiagnosis, color: "bg-red-500" },
  ];

  return (
    <div className="col-span-full p-4 bg-gray-50 rounded-xl shadow-md">
      <h2 className="text-2xl font-semibold mb-4 text-gray-700">Dashboard Técnico</h2>

      {/* Contenedor de cards sin scroll horizontal */}
      <div className="flex flex-wrap gap-4">
        {stats.map((stat, idx) => (
          <div
            key={idx}
            className={`flex-1 min-w-[200px] p-4 rounded-xl shadow-md text-white flex flex-col justify-between ${stat.color}`}
          >
            <span className="text-sm font-medium">{stat.label}</span>
            <span className="text-2xl font-bold mt-2">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* Información del técnico */}
      <div className="mt-6 p-4 bg-white shadow-md rounded-xl">
        <h3 className="text-lg font-semibold mb-2">Información del Técnico</h3>
        <p>
          <span className="font-medium">ID:</span> {dashboard.technician.id}
        </p>
        <p>
          <span className="font-medium">Usuario:</span> {dashboard.technician.username}
        </p>
        <p>
          <span className="font-medium">Roles:</span> {dashboard.technician.roles.join(", ")}
        </p>
      </div>
    </div>
  );
};

export default TechDashboardStates;
