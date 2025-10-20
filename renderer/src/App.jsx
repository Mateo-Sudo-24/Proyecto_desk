// App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layouts/dashboard";
import DashboardSuperAdmin from "./pages/DashboardSuperAdmin";
import DashboardUsuarioTickets from "./pages/DashboardUsuarioTickets";
import DashboardReception from "./pages/DashboardRecepcion";
import DashboardTech from "./pages/DashboardTecnico";
import DashboardSales from "./pages/DashboardVentas";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="superadmin" />} />
        <Route path="superadmin" element={<DashboardSuperAdmin />} />
        <Route path="users" element={<DashboardUsuarioTickets />} />
        <Route path="reception" element={<DashboardReception />} />
        <Route path="tech" element={<DashboardTech />} />
        <Route path="sales" element={<DashboardSales />} />
      </Route>

      <Route path="*" element={<div className="p-10 text-center">404 | Página no encontrada</div>} />
    </Routes>
  );
}

export default App;
