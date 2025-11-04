// renderer/src/components/tecnico/TechServiceActions.jsx
import React, { useEffect, useState } from "react";
import useFetch from "../../Hooks/useFetch";
import { CgSpinner } from "react-icons/cg";
import Swal from "sweetalert2";

const TechServiceActions = () => {
  const { fetchDataBackend } = useFetch();
  const [orders, setOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [finalNotes, setFinalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Cargar órdenes asignadas al técnico
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetchDataBackend("/employee/tech/orders", null, "GET", false);
        setOrders(response.data.orders || []);
      } catch (err) {
        console.error("Error al cargar órdenes:", err);
      } finally {
        setLoadingOrders(false);
      }
    };
    loadOrders();
  }, []);

  // Obtener la orden seleccionada
  const selectedOrder = orders.find((o) => o.OrderId === Number(selectedOrderId));

  const handleAction = async (action) => {
    if (!selectedOrderId) {
      Swal.fire("Atención", "Debes seleccionar una orden", "warning");
      return;
    }

    // Validar notas finales si va a finalizar el servicio
    if (action === "end") {
      if (selectedOrder?.Status?.Code !== "EN_PROCESO") {
        Swal.fire("Atención", "Solo puedes finalizar un servicio en curso", "warning");
        return;
      }
      if (!finalNotes.trim()) {
        Swal.fire("Atención", "Debes ingresar las notas finales", "warning");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint =
        action === "start"
          ? "/employee/tech/start-service"
          : "/employee/tech/end-service";

      const body =
        action === "start"
          ? { orderId: Number(selectedOrderId) }
          : { orderId: Number(selectedOrderId), finalNotes };

      await fetchDataBackend(endpoint, body, "POST", false);

      Swal.fire(
        "Éxito",
        `Servicio ${action === "start" ? "iniciado" : "finalizado"} correctamente`,
        "success"
      );

      // Limpiar notas al finalizar
      if (action === "end") setFinalNotes("");
      setSelectedOrderId("");

      // Actualizar lista de órdenes para reflejar cambios de estado
      const updatedOrders = orders.map((o) =>
        o.OrderId === Number(selectedOrderId)
          ? { ...o, Status: { Code: action === "start" ? "EN_PROCESO" : "COMPLETADO" } }
          : o
      );
      setOrders(updatedOrders);

    } catch (err) {
      Swal.fire("Error", "No se pudo completar la acción", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <h2 className="text-lg font-semibold mb-3">Acciones de servicio</h2>

      {loadingOrders ? (
        <div className="flex justify-center p-6">
          <CgSpinner className="animate-spin text-2xl text-gray-500" />
        </div>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-sm">No tienes órdenes asignadas.</p>
      ) : (
        <>
          <select
            value={selectedOrderId}
            onChange={(e) => setSelectedOrderId(e.target.value)}
            className="w-full border rounded-md px-3 py-2 mb-3 focus:ring-2 focus:ring-blue-400"
          >
            <option value="">Selecciona una orden</option>
            {orders.map((order) => (
              <option key={order.OrderId} value={order.OrderId}>
                {`#${order.OrderId} - Cliente: ${order.client?.DisplayName || "N/A"} - Equipo: ${order.equipment?.equipmentType?.Name || "N/A"} - Estado: ${order.Status?.Code || "SIN_ESTADO"}`}
              </option>
            ))}
          </select>

          {/* Textarea solo visible si la orden está en EN_PROCESO */}
          {selectedOrder?.Status?.Code === "EN_PROCESO" && (
            <textarea
              value={finalNotes}
              onChange={(e) => setFinalNotes(e.target.value)}
              placeholder="Notas finales (solo para finalizar servicio)"
              className="w-full border rounded-md px-3 py-2 mb-3 h-20 resize-none focus:ring-2 focus:ring-blue-400"
            />
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleAction("start")}
              disabled={loading || !selectedOrderId || selectedOrder?.Status?.Code === "EN_PROCESO"}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md flex-1"
            >
              {loading ? "Procesando..." : "Iniciar servicio"}
            </button>
            <button
              type="button"
              onClick={() => handleAction("end")}
              disabled={loading || !selectedOrderId || selectedOrder?.Status?.Code !== "EN_PROCESO"}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex-1"
            >
              {loading ? "Procesando..." : "Finalizar servicio"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default TechServiceActions;
