import React from "react";

// Componentes Recepción
import ReceptionList from "../components/recepcion/ReceptionList";
import ReceptionForm from "../components/recepcion/ReceptionForm";
import ReceptionStats from "../components/recepcion/ReceptionStats";

const DashboardRecepcion = () => {
  return (
    <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {/* Lista de clientes y equipos ocupa 2 columnas en pantallas grandes */}
      <div className="col-span-1 md:col-span-2">
        <ReceptionList />
      </div>

      {/* Formulario para registrar clientes y equipos */}
      <ReceptionForm />

      {/* Estadísticas del área de recepción */}
      <ReceptionStats />
    </div>
  );
};

export default DashboardRecepcion;
