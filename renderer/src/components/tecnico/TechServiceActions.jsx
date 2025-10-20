import React, { useState } from "react";

const TechServiceActions = () => {
  const [orderId, setOrderId] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow p-4 space-y-3">
      <h2 className="text-lg font-semibold mb-4">Acciones de Servicio</h2>
      <input
        type="text"
        value={orderId}
        onChange={(e) => setOrderId(e.target.value)}
        placeholder="ID de Orden"
        className="w-full border rounded-md p-2"
      />
      <div className="flex gap-2">
        <button className="flex-1 bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition">
          Iniciar Servicio
        </button>
        <button className="flex-1 bg-red-500 text-white py-2 rounded-lg hover:bg-red-600 transition">
          Finalizar Servicio
        </button>
      </div>
    </div>
  );
};

export default TechServiceActions;
