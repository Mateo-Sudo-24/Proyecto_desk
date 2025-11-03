import React, { useState, useEffect } from "react";
import useFetch from "../../hooks/useFetch";

const ReceptionStats = () => {
  const { fetchDataBackend } = useFetch();
  const [stats, setStats] = useState({
    clientsCount: 0,
    equipmentsCount: 0,
    ordersCount: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        setLoading(true);

        // Cargar estadísticas de recepción
        const [clientsRes, ordersRes] = await Promise.all([
          fetchDataBackend("/employee/search/clients", {}, "GET", false),
          fetchDataBackend("/employee/search/orders", {}, "GET", false)
        ]);

        let clientsCount = 0;
        let equipmentsCount = 0;
        let ordersCount = 0;

        if (clientsRes.success) {
          clientsCount = clientsRes.data.count || 0;
        }

        if (ordersRes.success) {
          ordersCount = ordersRes.data.totalCount || 0;

          // Contar equipos únicos de las órdenes
          const equipmentIds = new Set();
          ordersRes.data.results?.forEach(order => {
            if (order.equipment?.EquipmentId) {
              equipmentIds.add(order.equipment.EquipmentId);
            }
          });
          equipmentsCount = equipmentIds.size;
        }

        setStats({
          clientsCount,
          equipmentsCount,
          ordersCount
        });

      } catch (error) {
        console.error("Error cargando estadísticas:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-4 rounded-2xl shadow flex flex-col items-center">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-8"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-2xl shadow flex flex-col items-center">
        <p className="text-gray-500">Clientes Registrados</p>
        <p className="text-xl font-semibold text-gray-800">{stats.clientsCount}</p>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow flex flex-col items-center">
        <p className="text-gray-500">Equipos Registrados</p>
        <p className="text-xl font-semibold text-gray-800">{stats.equipmentsCount}</p>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow flex flex-col items-center">
        <p className="text-gray-500">Órdenes de Servicio</p>
        <p className="text-xl font-semibold text-gray-800">{stats.ordersCount}</p>
      </div>
    </div>
  );
};

export default ReceptionStats;
