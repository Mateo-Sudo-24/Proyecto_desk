import React, { useState, useEffect } from "react";
import useFetch from "../../hooks/useFetch";

const SalesOrdersList = () => {
  const { fetchDataBackend } = useFetch();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await fetchDataBackend("orders/admin/all-orders", null, "GET", false);
        if (response.success) {
          setOrders(response.data.orders);
        } else {
          setError("Error al cargar las órdenes");
        }
      } catch (err) {
        setError(err.message || "Error al cargar las órdenes");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [fetchDataBackend]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Órdenes de Ventas</h2>
        <div className="text-center p-4">Cargando órdenes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow p-4">
        <h2 className="text-lg font-semibold mb-4">Órdenes de Ventas</h2>
        <div className="text-center p-4 text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Órdenes de Ventas</h2>
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-100 text-left text-gray-600 text-sm">
          <tr>
            <th className="p-2 border-b">ID Orden</th>
            <th className="p-2 border-b">Cliente</th>
            <th className="p-2 border-b">Equipo</th>
            <th className="p-2 border-b">Estado</th>
            <th className="p-2 border-b">Fecha</th>
            <th className="p-2 border-b">Precio Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr className="text-center">
              <td colSpan="6" className="p-4 text-gray-500">
                No hay órdenes disponibles.
              </td>
            </tr>
          ) : (
            orders.map((order) => (
              <tr key={order.OrderId} className="hover:bg-gray-50">
                <td className="p-2 border-b">{order.OrderId}</td>
                <td className="p-2 border-b">{order.client?.DisplayName || "N/A"}</td>
                <td className="p-2 border-b">
                  {order.equipment?.equipmentType?.Name || "N/A"} - {order.equipment?.SerialNumber || ""}
                </td>
                <td className="p-2 border-b">{order.status?.Name || "N/A"}</td>
                <td className="p-2 border-b">
                  {new Date(order.IntakeDate).toLocaleDateString()}
                </td>
                <td className="p-2 border-b">${order.TotalPrice?.toFixed(2) || "0.00"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default SalesOrdersList;
