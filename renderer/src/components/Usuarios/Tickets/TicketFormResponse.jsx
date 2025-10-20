import React, { useState } from "react";

const TicketFormResponse = () => {
  const [ticketId, setTicketId] = useState("");
  const [message, setMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Agregar Respuesta al Ticket</h2>
      <form className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600">ID Ticket</label>
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            className="w-full border rounded-md p-2 mt-1"
            placeholder="Ingrese ID del ticket"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Mensaje</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full border rounded-md p-2 mt-1"
            placeholder="Escriba su respuesta"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isInternal}
            onChange={(e) => setIsInternal(e.target.checked)}
            id="internal"
            className="w-4 h-4"
          />
          <label htmlFor="internal" className="text-sm text-gray-600">Respuesta interna</label>
        </div>
        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Enviar Respuesta
        </button>
      </form>
    </div>
  );
};

export default TicketFormResponse;
