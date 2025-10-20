// src/components/gerencia/SuperAdmin/SystemStats.jsx
import React, { useEffect, useState } from "react";
import { BarChart3, Users, Server, Activity } from "lucide-react";
import useFetch from "../../../hooks/useFetch";
import { Loader2 } from "lucide-react";

const SystemStats = () => {
  const { fetchDataBackend } = useFetch();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const getStats = async () => {
    setLoading(true);
    try {
      const res = await fetchDataBackend("/admin/system/statistics", null, "GET");
      if (res.success) setStats(res.data);
    } catch (err) {
      console.error(err);
      alert("Error al obtener estadísticas del sistema");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStats();
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <Loader2 className="animate-spin text-blue-500" size={32} />
      <span className="ml-2 text-gray-600">Cargando estadísticas...</span>
    </div>
  );

  if (!stats) return null;

  const { system, business } = stats;

  return (
    <div className="bg-white rounded-2xl shadow p-6 h-full">
      <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
        <BarChart3 className="text-green-500" size={22} />
        Estadísticas del Sistema
      </h2>

      <div className="grid grid-cols-2 gap-3 text-center text-sm text-gray-700">
        <div className="bg-gray-50 p-3 rounded-lg">
          <Users className="mx-auto text-blue-500 mb-1" />
          <p>Usuarios activos</p>
          <p className="font-semibold text-lg">{system.activeUsers}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <Server className="mx-auto text-green-500 mb-1" />
          <p>Usuarios inactivos</p>
          <p className="font-semibold text-lg">{system.inactiveUsers}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <Activity className="mx-auto text-yellow-500 mb-1" />
          <p>Órdenes totales</p>
          <p className="font-semibold text-lg">{business.totalOrders}</p>
        </div>
        <div className="bg-gray-50 p-3 rounded-lg">
          <BarChart3 className="mx-auto text-red-500 mb-1" />
          <p>Roles totales</p>
          <p className="font-semibold text-lg">{system.totalRoles}</p>
        </div>
      </div>
    </div>
  );
};

export default SystemStats;
