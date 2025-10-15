// src/layouts/Dashboard.jsx
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { UserPlus, MonitorSpeaker, ClipboardPlus, LogOut } from "lucide-react";
import Logo from "../assets/logo.png";

const navigation = [
  { section: "Administrador", items: [{ name: "Usuarios", to: "users", icon: UserPlus, color: "blue" }] },
  { section: "Recepción", items: [{ name: "Recepción", to: "devices-reception", icon: MonitorSpeaker, color: "green" }] },
  { section: "Técnicos", items: [{ name: "Equipos Asignados", to: "devices-tech", icon: ClipboardPlus, color: "purple" }] },
];

export default function Dashboard() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`fixed inset-y-0 left-0 z-40 w-80 bg-white border-r border-gray-200 flex flex-col p-6 transition-transform duration-300 ease-in-out ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 md:static`}>
        <div className="p-6 border-b border-gray-100 flex justify-center">
          <img src={Logo} alt="Logo" className="w-32 h-auto" />
        </div>

        <nav className="flex-1 mt-6 space-y-8 overflow-y-auto">
          {navigation.map((group) => (
            <div key={group.section}>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">{group.section}</p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.name}>
                      <NavLink
                        to={item.to}
                        className={({ isActive }) =>
                          `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors duration-200 font-medium text-sm ${isActive ? `bg-${item.color}-50 text-${item.color}-600` : "text-gray-600 hover:bg-gray-50"}`
                        }
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon size={20} />
                        <span>{item.name}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-100 mt-auto">
          <NavLink to="/logout" className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50">
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </NavLink>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 z-30 bg-neutral opacity-50 md:hidden" onClick={() => setIsOpen(false)} />}

      <main className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <Outlet />
      </main>
    </div>
  );
}
