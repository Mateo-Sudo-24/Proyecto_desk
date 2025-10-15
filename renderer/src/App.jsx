// src/App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Dashboard from "./layouts/Dashboard";

// Dashboard Sections
import Users from "./components/gerencia/users";
import DashboardRecepcion from "./pages/DashboardRecepcion";
import EquiposTecnicos from "./components/tecnico/equipos";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Dashboard principal */}
        <Route path="/dashboard" element={<Dashboard />}>
          <Route path="users" element={<Users />} />
          <Route path="devices-reception" element={<DashboardRecepcion />} />
          <Route path="devices-tech" element={<EquiposTecnicos />} />
        </Route>

        {/* Redirigir rutas no encontradas */}
        <Route path="*" element={<div>404 | Página no encontrada</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
