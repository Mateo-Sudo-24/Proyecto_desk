import React, { useState, useEffect } from "react";
import useFetch from "../../hooks/useFetch";

const ReceptionList = () => {
  const { fetchDataBackend } = useFetch();
  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar clientes
        const clientsRes = await fetchDataBackend("/employee/search/clients", {}, "GET", false);
        if (clientsRes.success) {
          setClients(clientsRes.data.clients || []);
        }

        // Cargar equipos (todos los equipos con información de cliente)
        const equipmentsRes = await fetchDataBackend("/employee/search/orders", {}, "GET", false);
        if (equipmentsRes.success) {
          // Extraer equipos únicos de las órdenes
          const uniqueEquipments = [];
          const equipmentIds = new Set();

          equipmentsRes.data.results?.forEach(order => {
            if (order.equipment && !equipmentIds.has(order.equipment.EquipmentId)) {
              equipmentIds.add(order.equipment.EquipmentId);
              uniqueEquipments.push({
                ...order.equipment,
                clientName: order.client?.DisplayName || 'Cliente desconocido',
                equipmentTypeName: order.equipment.equipmentType?.TypeName || 'Tipo desconocido'
              });
            }
          });

          setEquipments(uniqueEquipments);
        }

      } catch (error) {
        console.error("Error cargando datos:", error);
        setError("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow space-y-6">
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-2">Cargando datos...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white p-4 rounded-2xl shadow space-y-6">
        <div className="text-center text-red-600 p-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-2xl shadow space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Lista de clientes</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border-b">Nombre</th>
              <th className="p-3 border-b">ID</th>
              <th className="p-3 border-b">Correo</th>
              <th className="p-3 border-b">Teléfono</th>
              <th className="p-3 border-b">Tipo</th>
            </tr>
          </thead>
          <tbody>
            {clients.length > 0 ? (
              clients.map((client) => (
                <tr key={client.ClientId} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{client.DisplayName}</td>
                  <td className="p-3 border-b">{client.IdNumber || '-'}</td>
                  <td className="p-3 border-b">{client.Email || '-'}</td>
                  <td className="p-3 border-b">{client.Phone || '-'}</td>
                  <td className="p-3 border-b">
                    {client.ClientTypeId === 1 ? 'Empresa' : client.ClientTypeId === 2 ? 'Persona Natural' : 'Otro'}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="text-center text-gray-500">
                <td colSpan="5" className="p-4">No hay clientes registrados todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2 className="text-xl font-semibold text-gray-800 mt-6">Lista de equipos</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-3 border-b">Cliente</th>
              <th className="p-3 border-b">Tipo de equipo</th>
              <th className="p-3 border-b">Marca/Modelo</th>
              <th className="p-3 border-b">Número de serie</th>
              <th className="p-3 border-b">Fecha registro</th>
            </tr>
          </thead>
          <tbody>
            {equipments.length > 0 ? (
              equipments.map((equipment) => (
                <tr key={equipment.EquipmentId} className="hover:bg-gray-50">
                  <td className="p-3 border-b">{equipment.clientName}</td>
                  <td className="p-3 border-b">{equipment.equipmentTypeName}</td>
                  <td className="p-3 border-b">{equipment.Brand} {equipment.Model}</td>
                  <td className="p-3 border-b">{equipment.SerialNumber || '-'}</td>
                  <td className="p-3 border-b">
                    {equipment.CreatedAt ? new Date(equipment.CreatedAt).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            ) : (
              <tr className="text-center text-gray-500">
                <td colSpan="5" className="p-4">No hay equipos registrados todavía.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ReceptionList;
