import React from "react";

const SalesOrdersList = () => {
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
          </tr>
        </thead>
        <tbody>
          <tr className="text-center">
            <td colSpan="4" className="p-4 text-gray-500">
              No hay órdenes disponibles.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default SalesOrdersList;
