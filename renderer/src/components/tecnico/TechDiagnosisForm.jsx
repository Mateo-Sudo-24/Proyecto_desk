// renderer/src/components/tecnico/TechDiagnosisForm.jsx
import React, { useState, useEffect } from "react";
import useFetch from "../../Hooks/useFetch";
import Swal from "sweetalert2";

const TechDiagnosisForm = () => {
  const { fetchDataBackend } = useFetch();
  const [orders, setOrders] = useState([]);
  const [formData, setFormData] = useState({
    orderId: "",
    diagnosis: "",
  });
  const [loading, setLoading] = useState(false);

  // Cargar órdenes asignadas al técnico para el select
  useEffect(() => {
    const loadOrders = async () => {
      try {
        const data = await fetchDataBackend("/employee/tech/orders", null, "GET", false);
        setOrders(data.data?.orders || []);
      } catch (err) {
        console.error("Error al obtener órdenes:", err);
      }
    };
    loadOrders();
  }, []);

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.orderId) {
      Swal.fire("Error", "Por favor selecciona una orden.", "warning");
      return;
    }

    setLoading(true);
    try {
      await fetchDataBackend(
        "/employee/tech/diagnosis",
        {
          orderId: Number(formData.orderId), // 🔹 convertir a número
          diagnosis: formData.diagnosis,
        },
        "POST"
      );

      Swal.fire("Éxito", "Diagnóstico registrado correctamente", "success");
      setFormData({ orderId: "", diagnosis: "" });
    } catch (err) {
      Swal.fire("Error", "No se pudo registrar el diagnóstico", "error");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <h2 className="text-lg font-semibold mb-3">Registrar diagnóstico</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <select
          name="orderId"
          value={formData.orderId}
          onChange={handleChange}
          className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400"
          required
        >
          <option value="">-- Selecciona una orden --</option>
          {orders.map((order) => (
            <option key={order.OrderId} value={order.OrderId}>
              {`#${order.IdentityTag} - ${order.client?.DisplayName}`}
            </option>
          ))}
        </select>

        <textarea
          name="diagnosis"
          placeholder="Escribe el diagnóstico técnico..."
          value={formData.diagnosis}
          onChange={handleChange}
          className="w-full border rounded-md px-3 py-2 h-24 resize-none focus:ring-2 focus:ring-blue-400"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-md w-full"
        >
          {loading ? "Enviando..." : "Registrar diagnóstico"}
        </button>
      </form>
    </div>
  );
};

export default TechDiagnosisForm;
