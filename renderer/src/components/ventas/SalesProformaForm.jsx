import React, { useState } from "react";

const SalesProformaForm = () => {
  const [orderId, setOrderId] = useState("");
  const [parts, setParts] = useState("");
  const [totalPrice, setTotalPrice] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Generar Proforma</h2>
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
        <div>
          <label className="block text-sm text-gray-600">Repuestos / Detalles</label>
          <textarea
            value={parts}
            onChange={(e) => setParts(e.target.value)}
            className="w-full border rounded-md p-2 mt-1"
            placeholder="Ingrese repuestos o detalles de la proforma"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-600">Precio Total</label>
          <input
            type="number"
            value={totalPrice}
            onChange={(e) => setTotalPrice(e.target.value)}
            className="w-full border rounded-md p-2 mt-1"
            placeholder="Ingrese precio total"
          />
        </div>
        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Generar Proforma
        </button>
      </form>
    </div>
  );
};

export default SalesProformaForm;
