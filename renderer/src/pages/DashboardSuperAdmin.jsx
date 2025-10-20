import React from "react";

// Componentes de SuperAdmin
import AdminList from "../components/gerencia/SuperAdmin/AdminList";
import AdminForm from "../components/gerencia/SuperAdmin/AdminForm";
import CreateRole from "../components/gerencia/SuperAdmin/Roles/CreateRole";
import RoleList from "../components/gerencia/SuperAdmin/Roles/RoleList";
import SystemStats from "../components/gerencia/SuperAdmin/SystemStats";
import SystemLogs from "../components/gerencia/SuperAdmin/SystemLogs";

const DashboardSuperAdmin = () => {
  return (
    <div className="p-6 space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">
          Panel Super Administrador
        </h1>
      </div>

      {/* Grid general */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: AdminList arriba, RoleList abajo */}
        <div className="md:col-span-2 flex flex-col gap-6">
          <AdminList />
          <RoleList />
          <SystemLogs />
        </div>

        {/* Columna derecha: AdminForm arriba, CreateRole abajo */}
        <div className="flex flex-col gap-6">
          <AdminForm />
          <CreateRole />
          <SystemStats />
        </div>

      </div>
    </div>
  );
};

export default DashboardSuperAdmin;
