import React from "react";

const ReceptionList = () => {
  return (
    <div className="bg-white p-4 rounded-2xl shadow space-y-6">
      <h2 className="text-xl font-semibold text-gray-800">Lista de clientes</h2>
      <table className="min-w-full border-collapse text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 border-b">Nombre</th>
            <th className="p-3 border-b">ID</th>
            <th className="p-3 border-b">Correo</th>
            <th className="p-3 border-b">Teléfono</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center text-gray-500">
            <td colSpan="4" className="p-4">No hay clientes registrados todavía.</td>
          </tr>
        </tbody>
      </table>

      <h2 className="text-xl font-semibold text-gray-800 mt-6">Lista de equipos</h2>
      <table className="min-w-full border-collapse text-left">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-3 border-b">Cliente</th>
            <th className="p-3 border-b">Tipo de equipo</th>
            <th className="p-3 border-b">Marca/Modelo</th>
            <th className="p-3 border-b">Número de serie</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center text-gray-500">
            <td colSpan="4" className="p-4">No hay equipos registrados todavía.</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};

export default ReceptionList;
