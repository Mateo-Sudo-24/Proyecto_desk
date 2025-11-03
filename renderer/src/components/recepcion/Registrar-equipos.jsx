// src/components/Recepciom/EquipmentTable.jsx
import React, { useState, useEffect, useMemo } from "react";
import { FiSearch, FiPlus } from "react-icons/fi";
import useFetch from "../../hooks/useFetch";
import RegisterEquipmentForm from "./RegisterEquipmentAndList";

const EquipmentTable = () => {
  const { fetchDataBackend } = useFetch();
  const [equipments, setEquipments] = useState([]);
  const [clients, setClients] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Cargar clientes y tipos de equipo al iniciar
  useEffect(() => {
    const loadData = async () => {
      try {
        // 🔹 Clientes
        const clientsRes = await fetchDataBackend("/employee/search/clients", null, "GET", false);
        const mappedClients = (clientsRes.data?.clients || []).map(c => ({
          id: c.clientId,
          displayName: c.displayName || c.organizationName
        }));
        setClients(mappedClients);

        // 🔹 Tipos de equipo
        const typesRes = await fetchDataBackend("/employee/equipment-types", null, "GET", false);
        const mappedTypes = (typesRes.data?.types || []).map(t => ({
          id: t.id,
          name: t.name
        }));
        setEquipmentTypes(mappedTypes);

        // ⚠️ No hay endpoint general de todos los equipos.
        // Puedes cargar equipos por cliente cuando sea necesario
        // setEquipments(...);
      } catch (err) {
        console.error("Error al cargar datos:", err);
      }
    };
    loadData();
  }, [fetchDataBackend]);

  // Filtrado por búsqueda
  const filteredEquipments = useMemo(() => {
    return equipments.filter(eq =>
      [eq.brand, eq.model, eq.serialNumber].some(val =>
        val?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  }, [equipments, searchTerm]);

  // Registrar nuevo equipo
  const handleCreateEquipment = async (payload) => {
    try {
      const res = await fetchDataBackend("/employee/receptionist/equipment", payload, "POST");
      if (!res.success) throw new Error(res.message || "Error al registrar el equipo");
      // El backend devuelve { equipment: { ... } }
      setEquipments(prev => [...prev, res.data.equipment]);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Error al registrar equipo:", err);
      alert(err.message || "No se pudo registrar el equipo");
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between mb-4">
        <input
          type="text"
          placeholder="Buscar equipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded p-2 w-1/3"
        />
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          <FiPlus /> Registrar equipo
        </button>
      </div>

      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-2 py-1">Cliente</th>
            <th className="border px-2 py-1">Tipo de equipo</th>
            <th className="border px-2 py-1">Marca</th>
            <th className="border px-2 py-1">Modelo</th>
            <th className="border px-2 py-1">Serial</th>
          </tr>
        </thead>
        <tbody>
          {filteredEquipments.map((eq, idx) => (
            <tr key={idx} className="text-center border">
              <td className="border px-2 py-1">{eq.clientName}</td>
              <td className="border px-2 py-1">{eq.equipmentTypeName}</td>
              <td className="border px-2 py-1">{eq.brand}</td>
              <td className="border px-2 py-1">{eq.model}</td>
              <td className="border px-2 py-1">{eq.serialNumber}</td>
            </tr>
          ))}
          {filteredEquipments.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-4">
                No hay equipos registrados
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {showCreateModal && (
        <RegisterEquipmentForm
          clients={clients}
          equipmentTypes={equipmentTypes}
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateEquipment}
        />
      )}
    </div>
  );
};

export default EquipmentTable;
