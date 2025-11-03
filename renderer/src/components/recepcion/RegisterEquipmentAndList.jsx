// src/components/Reception/RegisterEquipment.jsx
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, AlertCircle } from "lucide-react";
import useFetch from "../../hooks/useFetch";
import Swal from "sweetalert2";

const RegisterEquipment = () => {
  const { fetchDataBackend } = useFetch();

  const [clients, setClients] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm({
    defaultValues: {
      clientId: "",
      equipmentTypeId: "",
      brand: "",
      model: "",
      serialNumber: "",
      description: "",
    },
  });

  // Cargar clientes, tipos y lista de equipos
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Clientes
        const clientsRes = await fetchDataBackend("/employee/search/clients", null, "GET", false);
        setClients(clientsRes?.data?.clients?.map(c => ({
          ...c,
          DisplayName: c.DisplayName || c.OrganizationName || "Sin nombre",
        })) || []);

        // Tipos de equipo
        const typesRes = await fetchDataBackend("/employee/equipment-types", null, "GET", false);
        setEquipmentTypes(typesRes?.data?.types?.map(t => ({
          id: t.id,
          name: t.name || "Sin tipo",
        })) || []);

        // Equipos existentes
        await fetchEquipments();
      } catch (err) {
        console.error(err);
        setError("Error cargando datos");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [fetchDataBackend]);

  const fetchEquipments = async () => {
    try {
      const res = await fetchDataBackend("/employee/search/orders", null, "GET", false);
      const uniqueEquipments = [];
      const ids = new Set();

      res?.data?.results?.forEach(order => {
        if (order.equipment && !ids.has(order.equipment.EquipmentId)) {
          ids.add(order.equipment.EquipmentId);
          uniqueEquipments.push({
            ...order.equipment,
            clientName: order.client?.DisplayName || order.client?.OrganizationName || "Sin nombre",
            equipmentTypeName: order.equipment.equipmentType?.TypeName || "Tipo desconocido",
          });
        }
      });

      setEquipments(uniqueEquipments);
    } catch (err) {
      console.error("Error cargando equipos:", err);
    }
  };

  const onSubmit = async (data) => {
    try {
      const payload = {
        clientId: Number(data.clientId),
        equipmentTypeId: Number(data.equipmentTypeId),
        brand: data.brand,
        model: data.model,
        serialNumber: data.serialNumber,
        description: data.description || "",
      };

      const res = await fetchDataBackend("/employee/receptionist/equipment", payload, "POST");
      if (!res.success) throw new Error(res.message || "Error registrando equipo");

      Swal.fire({
        icon: "success",
        title: "Equipo registrado",
        text: `${payload.brand} ${payload.model} registrado correctamente`,
      });

      reset();
      await fetchEquipments();
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: err.message || "No se pudo registrar el equipo",
      });
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center h-64 text-gray-500">
      <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Cargando información...
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center h-64 text-red-600">
      <AlertCircle className="w-8 h-8 mb-2" />
      <p className="text-center font-semibold">{error}</p>
      <button onClick={() => window.location.reload()} className="mt-4 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="p-6 bg-white shadow-md rounded-2xl space-y-6">
      {/* FORMULARIO */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-gray-50 p-4 rounded-2xl shadow">
        <h2 className="text-lg font-bold text-gray-700 mb-2">Registrar Equipo</h2>

        <div>
          <label className="block mb-1 font-medium">Cliente</label>
          <select {...register("clientId", { required: "Cliente obligatorio" })} className="w-full p-2 border rounded">
            <option value="">Selecciona un cliente</option>
            {clients.map(c => <option key={c.ClientId} value={c.ClientId}>{c.DisplayName}</option>)}
          </select>
          {errors.clientId && <span className="text-red-600">{errors.clientId.message}</span>}
        </div>

        <div>
          <label className="block mb-1 font-medium">Tipo de Equipo</label>
          <select {...register("equipmentTypeId", { required: "Tipo de equipo obligatorio" })} className="w-full p-2 border rounded">
            <option value="">Selecciona un tipo</option>
            {equipmentTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          {errors.equipmentTypeId && <span className="text-red-600">{errors.equipmentTypeId.message}</span>}
        </div>

        <div>
          <label className="block mb-1 font-medium">Marca</label>
          <input type="text" {...register("brand", { required: "Marca obligatoria" })} className="w-full p-2 border rounded" />
          {errors.brand && <span className="text-red-600">{errors.brand.message}</span>}
        </div>

        <div>
          <label className="block mb-1 font-medium">Modelo</label>
          <input type="text" {...register("model", { required: "Modelo obligatorio" })} className="w-full p-2 border rounded" />
          {errors.model && <span className="text-red-600">{errors.model.message}</span>}
        </div>

        <div>
          <label className="block mb-1 font-medium">Número de Serie</label>
          <input type="text" {...register("serialNumber", { required: "Número de serie obligatorio" })} className="w-full p-2 border rounded" />
          {errors.serialNumber && <span className="text-red-600">{errors.serialNumber.message}</span>}
        </div>

        <div>
          <label className="block mb-1 font-medium">Descripción</label>
          <input type="text" {...register("description")} className="w-full p-2 border rounded" />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
          {isSubmitting ? "Registrando..." : "Registrar Equipo"}
        </button>
      </form>

      {/* LISTA DE EQUIPOS */}
      {equipments.length > 0 && (
        <div className="overflow-x-auto">
          <h2 className="text-xl font-bold mb-2 text-gray-700">📋 Lista de Equipos Registrados</h2>
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-600 border-b">Cliente</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-600 border-b">Tipo de Equipo</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-600 border-b">Marca</th>
                <th className="py-2 px-4 text-left text-sm font-semibold text-gray-600 border-b">Modelo</th>
              </tr>
            </thead>
            <tbody>
              {equipments.map(eq => (
                <tr key={eq.EquipmentId} className="hover:bg-gray-50 transition-colors">
                  <td className="py-2 px-4 border-b">{eq.clientName}</td>
                  <td className="py-2 px-4 border-b">{eq.equipmentTypeName}</td>
                  <td className="py-2 px-4 border-b">{eq.Brand}</td>
                  <td className="py-2 px-4 border-b">{eq.Model}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default RegisterEquipment;
