import React from "react";
import TechOrdersList from "../components/tecnico/TechOrdersList";
import TechDiagnosisForm from "../components/tecnico/TechDiagnosisForm";
import TechServiceActions from "../components/tecnico/TechServiceActions";

const DashboardTecnico = () => {
  return (
    <div className="p-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div className="col-span-1 md:col-span-2">
        <TechOrdersList />
      </div>
      <TechDiagnosisForm />
      <TechServiceActions />
    </div>
  );
};

export default DashboardTecnico;
