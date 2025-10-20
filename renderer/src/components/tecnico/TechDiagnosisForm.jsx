import React, { useState } from "react";

const TechDiagnosisForm = () => {
  const [orderId, setOrderId] = useState("");
  const [diagnosis, setDiagnosis] = useState("");

  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <h2 className="text-lg font-semibold mb-4">Agregar Diagnóstico</h2>
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
          <label className="block text-sm text-gray-600">Diagnóstico</label>
          <textarea
            value={diagnosis}
            onChange={(e) => setDiagnosis(e.target.value)}
            className="w-full border rounded-md p-2 mt-1"
            placeholder="Ingrese diagnóstico"
          />
        </div>
        <button
          type="button"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          Guardar diagnóstico
        </button>
      </form>
    </div>
  );
};

export default TechDiagnosisForm;
