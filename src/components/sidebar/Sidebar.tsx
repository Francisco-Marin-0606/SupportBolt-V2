// src/components/Sidebar/index.js
'use client';
import { logout } from '@/app/_services/authService';
import { LocalStorageService } from '@/app/_services/localStorageService';
import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Users
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

// Definir el tipo correcto para los elementos del menú
type MenuItem = {
  name: string;
  icon: React.ElementType;
  path: string;
};

const menuItems: MenuItem[] = [
  // { 
  //   name: 'Dashboard', 
  //   icon: LayoutDashboard, 
  //   path: '/dashboard' 
  // },
  // { 
  //   name: 'Pedidos', 
  //   icon: Settings, 
  //   path: '/orders' 
  // },
  { 
    name: 'Lista de usuarios', 
    icon: Users, 
    path: '/users' 
  },
  { 
    name: 'Audios', 
    icon: Settings, 
    path: '/audios' 
  },
  // { 
  //   name: 'Configuración', 
  //   icon: Settings, 
  //   path: '/settings' 
  // },
];

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Función para verificar si una ruta está activa
  const isRouteActive = (path: string): boolean => {
    if (path === '/users') {
      return pathname === '/users' || pathname.startsWith('/user/');
    }
    if (path === '/audios') {
      return pathname === '/audios' || pathname.startsWith('/audio/');
    }
    return pathname === path;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  const handleLogout = () => {
    try {
      logout();
      LocalStorageService.clearAll();
      router.push('/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  const handleNavigation = (path: string) => {
    // Limpiar el localStorage según la sección actual
    if (pathname.includes('/users')) {
      LocalStorageService.clearSection('audios');
    } else if (pathname.includes('/audios')) {
      LocalStorageService.clearSection('users');
    }
    router.push(path);
  };

  return (
    <div 
      className={`
        h-screen bg-background-primary shadow-lg transition-all duration-300 
        ${isCollapsed ? 'w-20' : 'w-64'} fixed left-0 top-0
      `}
    >
      {/* Header del Sidebar */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
        {!isCollapsed && (
          <span className="text-xl font-bold text-primary">Mental Support </span>
        )}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label={isCollapsed ? "Expandir menú" : "Colapsar menú"}
        >
          {isCollapsed ? (
            <ChevronRight className="w-6 h-6" />
          ) : (
            <ChevronLeft className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Menú de navegación */}
      <nav className="p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = isRouteActive(item.path);

            return (
              <li key={item.path}>
                <button
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    flex items-center space-x-2 p-3 rounded-lg transition-colors w-full
                    ${isActive 
                      ? 'bg-primary text-white' 
                      : 'hover:bg-gray-100 text-gray-700'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {!isCollapsed && <span>{item.name}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer del Sidebar */}
      <div className="absolute bottom-0 w-full p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className={`
            flex items-center space-x-2 w-full p-3 rounded-lg
            text-gray-700 hover:bg-gray-100 transition-colors
          `}
        >
          <LogOut className="w-5 h-5" />
          {!isCollapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </div>
  );
}