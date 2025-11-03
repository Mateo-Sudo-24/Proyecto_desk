// src/App.jsx
import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardLayout from "./layouts/dashboard";
import DashboardSuperAdmin from "./pages/DashboardSuperAdmin";
import DashboardUsuarioTickets from "./pages/DashboardUsuarioTickets";
import DashboardReception from "./pages/DashboardRecepcion";
import DashboardTech from "./pages/DashboardTecnico";
import DashboardSales from "./pages/DashboardVentas";
import Logout from "./pages/Logout";
import PrivateRoute from "./routes/PrivateRoute";

function App() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/logout" element={<Logout />} />

      {/* Dashboard con layout */}
      <Route path="/dashboard" element={<DashboardLayout />}>
        <Route index element={<Navigate to="superadmin" replace />} />

        <Route element={<PrivateRoute page="superadmin" />}>
          <Route path="superadmin" element={<DashboardSuperAdmin />} />
        </Route>

        <Route element={<PrivateRoute page="users" />}>
          <Route path="users" element={<DashboardUsuarioTickets />} />
        </Route>

        <Route element={<PrivateRoute page="reception" />}>
          <Route path="reception" element={<DashboardReception />} />
        </Route>

        <Route element={<PrivateRoute page="tech" />}>
          <Route path="tech" element={<DashboardTech />} />
        </Route>

        <Route element={<PrivateRoute page="sales" />}>
          <Route path="sales" element={<DashboardSales />} />
        </Route>
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={<div className="p-10 text-center">404 | Página no encontrada</div>}
      />
    </Routes>
  );
}

export default App;
