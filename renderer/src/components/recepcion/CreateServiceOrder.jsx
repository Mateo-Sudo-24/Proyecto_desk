// renderer/src/components/recepcion/CreateServiceOrder.jsx
import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import useFetch from "../../hooks/useFetch";
import Swal from "sweetalert2";

const CreateServiceOrder = () => {
  const { fetchDataBackend } = useFetch();

  const [clients, setClients] = useState([]);
  const [equipments, setEquipments] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
    setValue,
  } = useForm({
    defaultValues: {
      clientId: "",
      equipmentId: "",
      technicianId: "",
      notes: "",
      estimatedDeliveryDate: "",
    },
  });

  // Observar cambios en clientId para filtrar equipos
  const selectedClientId = watch("clientId");

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setLoadingData(true);

        // Cargar clientes
        const clientsRes = await fetchDataBackend("/employee/search/clients", {}, "GET", false);
        if (clientsRes.success) {
          setClients(clientsRes.data.clients || []);
        }

        // Cargar técnicos (usuarios con rol técnico)
        const techRes = await fetchDataBackend("/employee/technicians", {}, "GET", false);
        if (techRes.success) {
          setTechnicians(techRes.data.technicians || []);
        }

      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
      } finally {
        setLoadingData(false);
      }
    };

    loadInitialData();
  }, []);

  // Cargar equipos cuando se selecciona un cliente
  useEffect(() => {
    const loadEquipments = async () => {
      if (!selectedClientId) {
        setEquipments([]);
        setValue("equipmentId", "");
        return;
      }

      try {
        const equipRes = await fetchDataBackend(
          `/employee/client/${selectedClientId}/equipments`,
          {},
          "GET",
          false
        );
        if (equipRes.success) {
          setEquipments(equipRes.data.equipments || []);
        }
      } catch (error) {
        console.error("Error cargando equipos:", error);
        setEquipments([]);
      }
    };

    loadEquipments();
  }, [selectedClientId, setValue]);

  const onSubmit = async (data) => {
    try {
      const submitData = {
        clientId: parseInt(data.clientId),
        equipmentId: parseInt(data.equipmentId),
        technicianId: data.technicianId ? parseInt(data.technicianId) : undefined,
        notes: data.notes || "",
        estimatedDeliveryDate: data.estimatedDeliveryDate || null,
      };

      const res = await fetchDataBackend(
        "/employee/receptionist/create-order",
        submitData,
        "POST"
      );

      if (res.success) {
        Swal.fire("Éxito", "Orden de servicio creada correctamente", "success");
        reset();
        setEquipments([]); // Limpiar equipos al resetear
      } else {
        Swal.fire("Error", res.message || "Error al crear orden", "error");
      }
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Error de conexión con el servidor", "error");
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Cargando datos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Crear Orden de Servicio
        </h2>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid grid-cols-1 md:grid-cols-2 gap-4"
        >
          {/* Seleccionar Cliente */}
          <div className="col-span-full">
            <label className="block mb-1 font-medium">Cliente *</label>
            <select
              {...register("clientId", { required: "Cliente requerido" })}
              className="w-full p-2 border rounded"
            >
              <option value="">Selecciona un cliente</option>
              {clients.map((client) => (
                <option key={client.ClientId} value={client.ClientId}>
                  {client.DisplayName} - {client.IdNumber}
                </option>
              ))}
            </select>
            {errors.clientId && (
              <span className="text-red-600 text-sm">{errors.clientId.message}</span>
            )}
          </div>

          {/* Seleccionar Equipo */}
          <div className="col-span-full">
            <label className="block mb-1 font-medium">Equipo *</label>
            <select
              {...register("equipmentId", { required: "Equipo requerido" })}
              className="w-full p-2 border rounded"
              disabled={!selectedClientId}
            >
              <option value="">
                {selectedClientId ? "Selecciona un equipo" : "Primero selecciona un cliente"}
              </option>
              {equipments.map((equipment) => (
                <option key={equipment.EquipmentId} value={equipment.EquipmentId}>
                  {equipment.Brand} {equipment.Model} - {equipment.SerialNumber}
                </option>
              ))}
            </select>
            {errors.equipmentId && (
              <span className="text-red-600 text-sm">{errors.equipmentId.message}</span>
            )}
          </div>

          {/* Seleccionar Técnico (opcional) */}
          <div>
            <label className="block mb-1 font-medium">Técnico Asignado (opcional)</label>
            <select
              {...register("technicianId")}
              className="w-full p-2 border rounded"
            >
              <option value="">Sin asignar</option>
              {technicians.map((tech) => (
                <option key={tech.UserId} value={tech.UserId}>
                  {tech.Username}
                </option>
              ))}
            </select>
          </div>

          {/* Fecha Estimada de Entrega */}
          <div>
            <label className="block mb-1 font-medium">Fecha Estimada de Entrega (opcional)</label>
            <input
              type="date"
              {...register("estimatedDeliveryDate")}
              className="w-full p-2 border rounded"
              min={new Date().toISOString().split('T')[0]} // Fecha mínima hoy
            />
          </div>

          {/* Notas. */}
          <div className="col-span-full">
            <label className="block mb-1 font-medium">Notas (opcional)</label>
            <textarea
              {...register("notes")}
              placeholder="Notas adicionales sobre la orden..."
              className="w-full p-2 border rounded resize-none"
              rows="3"
            />
          </div>

          {/* Botón de envío. */}
          <div className="col-span-full flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Creando Orden..." : "Crear Orden de Servicio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateServiceOrder;