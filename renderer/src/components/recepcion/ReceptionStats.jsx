import React from "react";

const ReceptionStats = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="bg-white p-4 rounded-2xl shadow flex flex-col items-center">
        <p className="text-gray-500">Clientes Registrados</p>
        <p className="text-xl font-semibold text-gray-800">—</p>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow flex flex-col items-center">
        <p className="text-gray-500">Equipos Registrados</p>
        <p className="text-xl font-semibold text-gray-800">—</p>
      </div>
      <div className="bg-white p-4 rounded-2xl shadow flex flex-col items-center">
        <p className="text-gray-500">Órdenes de Servicio</p>
        <p className="text-xl font-semibold text-gray-800">—</p>
      </div>
    </div>
  );
};

export default ReceptionStats;
