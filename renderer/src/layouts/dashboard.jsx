// src/layouts/DashboardLayout.jsx
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  User,
  MonitorSpeaker,
  CreditCard,
  Headset,
  LogOut,
} from "lucide-react";
import Logo from "../assets/logo.png";
import { useTokenRefresh } from "../hooks/useTokenRefresh";
import useAuthStore from "../context/storeAuth";
import { pagePermissions } from "../helpers/pagePermissions";

const sidebarLinks = [
  { title: "Super Admin", path: "/dashboard/superadmin", icon: LayoutDashboard, page: "superadmin" },
  { title: "Usuarios", path: "/dashboard/users", icon: User, page: "users" },
  { title: "Recepción", path: "/dashboard/reception", icon: MonitorSpeaker, page: "reception" },
  { title: "Técnico", path: "/dashboard/tech", icon: MonitorSpeaker, page: "tech" },
  { title: "Ventas", path: "/dashboard/sales", icon: CreditCard, page: "sales" },
  { title: "Soporte", path: "/dashboard/support", icon: Headset, page: "support" },
];

export default function DashboardLayout() {
  const { pathname } = useLocation();
  const { user } = useAuthStore();
  const roles = user?.roles.map(r => r.toLowerCase()) || [];

  useTokenRefresh();

  return (
    <div className="md:flex md:min-h-screen">
      {/* Sidebar */}
      <aside className="md:w-64 bg-white shadow flex flex-col px-5 py-6">
        <div className="flex justify-center mb-6">
          <img src={Logo} alt="Logo" className="w-28 h-auto" />
        </div>

        <ul className="space-y-2">
          {sidebarLinks.map(({ title, path, icon: Icon, page }) => {
            const allowedRoles = pagePermissions[page]?.map(r => r.toLowerCase()) || [];
            // Mostrar solo si el rol del usuario tiene permiso
            if (!roles.some(role => allowedRoles.includes(role))) return null;

            return (
              <li key={path}>
                <NavLink
                  to={path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                      isActive ? "bg-blue-400 text-black" : "hover:bg-yellow-300 text-black"
                    }`
                  }
                >
                  <Icon size={18} /> {title}
                </NavLink>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto pt-4 border-t border-gray-300">
          <NavLink
            to="/logout"
            className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
              pathname === "/logout"
                ? "bg-gray-900 text-black"
                : "hover:bg-red-700 text-black"
            }`}
          >
            <LogOut size={18} /> Cerrar Sesión
          </NavLink>
        </div>
      </aside>

      {/* Contenido principal */}
      <main className="flex-1 bg-gray-100 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
