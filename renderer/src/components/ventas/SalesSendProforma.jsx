import React, { useState } from "react";

const SalesSendProforma = () => {
  const [orderId, setOrderId] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Enviar Proforma al Cliente</h2>
      <form className="space-y-3">
        <div>
          <label className="block text-sm text-gray-600">ID de Orden</label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full border rounded-md p-2 mt-1"
            placeholder="Ingrese ID de la orden"
          />
        </div>
        <button
          type="button"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Enviar Proforma
        </button>
      </form>
    </div>
  );
};

export default SalesSendProforma;
