// renderer/src/components/tecnico/TechOrdersList.jsx
import React, { useEffect, useState } from "react";
import useFetch from "../../Hooks/useFetch";
import { CgSpinner } from "react-icons/cg";
import { FiEye } from "react-icons/fi";

const TechOrdersList = () => {
  const { fetchDataBackend } = useFetch();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const response = await fetchDataBackend("/employee/tech/orders");
        if (response.success && response.data?.orders) {
          setOrders(response.data.orders); // <-- solo el array
        } else {
          setOrders([]);
        }
      } catch (err) {
        console.error("Error al obtener órdenes:", err);
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };
    loadOrders();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center p-6">
        <CgSpinner className="animate-spin text-2xl text-gray-500" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-4">
      <h2 className="text-lg font-semibold mb-3">Órdenes asignadas</h2>

      {orders.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay órdenes asignadas.</p>
      ) : (
        <ul className="divide-y">
          {orders.map((order) => (
            <li
              key={order.OrderId}
              className="py-3 flex justify-between items-center"
            >
              <div>
                <p className="font-medium text-gray-800">
                  {order.client?.DisplayName || "Cliente desconocido"}
                </p>
                <p className="text-sm text-gray-500">
                  {order.equipment?.equipmentType?.Name || "Equipo desconocido"}
                </p>
              </div>
              <button
                onClick={() => setSelected(order)}
                className="text-blue-600 hover:text-blue-800"
              >
                <FiEye />
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="mt-4 border-t pt-3">
          <h3 className="text-md font-semibold mb-2">Detalles de la orden</h3>
          <p>
            <strong>ID:</strong> {selected.OrderId}
          </p>
          <p>
            <strong>Cliente:</strong> {selected.client?.DisplayName}
          </p>
          <p>
            <strong>Equipo:</strong> {selected.equipment?.equipmentType?.Name}
          </p>
          <p>
            <strong>Estado:</strong> {selected.status?.Name}
          </p>
          <button
            onClick={() => setSelected(null)}
            className="mt-2 text-sm text-red-500 hover:underline"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
};

export default TechOrdersList;
