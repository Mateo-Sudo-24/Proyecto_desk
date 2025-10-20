import React from "react";

const TicketList = () => {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Lista de Tickets</h2>
      <table className="min-w-full border-collapse">
        <thead className="bg-gray-100 text-left text-gray-600 text-sm">
          <tr>
            <th className="p-2 border-b">ID Ticket</th>
            <th className="p-2 border-b">Cliente</th>
            <th className="p-2 border-b">Orden</th>
            <th className="p-2 border-b">Estado</th>
            <th className="p-2 border-b">Prioridad</th>
            <th className="p-2 border-b">Respuestas</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center">
            <td colSpan="6" className="p-4 text-gray-500">
              No hay tickets disponibles.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default TicketList;
