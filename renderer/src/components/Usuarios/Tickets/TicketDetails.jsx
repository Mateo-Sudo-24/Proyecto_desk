import React from "react";

const TicketDetails = () => {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Detalles del Ticket</h2>
      <div className="space-y-2 text-gray-700">
        <p><strong>ID Ticket:</strong> --</p>
        <p><strong>Cliente:</strong> --</p>
        <p><strong>Orden:</strong> --</p>
        <p><strong>Estado:</strong> --</p>
        <p><strong>Categoría:</strong> --</p>
        <p><strong>Asignado a:</strong> --</p>
        <p><strong>Respuestas:</strong> --</p>
      </div>
    </div>
  );
};

export default TicketDetails;
