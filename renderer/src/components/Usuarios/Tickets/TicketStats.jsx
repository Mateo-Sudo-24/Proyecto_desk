import React from "react";

const TicketStats = () => {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Estadísticas de Tickets</h2>
      <ul className="space-y-2 text-gray-700">
        <li><strong>Total Tickets:</strong> --</li>
        <li><strong>Abiertos:</strong> --</li>
        <li><strong>Asignados:</strong> --</li>
        <li><strong>En Progreso:</strong> --</li>
        <li><strong>Resueltos:</strong> --</li>
        <li><strong>Cerrados:</strong> --</li>
      </ul>
    </div>
  );
};

export default TicketStats;
