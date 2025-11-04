// renderer/src/pages/DashboardTecnico.jsx
import React from "react";
import TechOrdersList from "../components/tecnico/TechOrdersList";
import TechDiagnosisForm from "../components/tecnico/TechDiagnosisForm";
import TechServiceActions from "../components/tecnico/TechServiceActions";
import TechDashboardStates from "../components/tecnico/TechDashboardStates";

const DashboardTecnico = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Primera fila: 3 columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <TechOrdersList />
        <TechDiagnosisForm />
        <TechServiceActions />
      </div>

      {/* Segunda fila: dashboard horizontal full width */}
      <div className="grid grid-cols-1">
        <TechDashboardStates />
      </div>
    </div>
  );
};

export default DashboardTecnico;
