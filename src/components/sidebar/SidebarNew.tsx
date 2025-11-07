"use client";

import { logout } from "@/app/_services/authService";
import { LocalStorageService } from "@/app/_services/localStorageService";
import { SectionUrlService } from "@/app/_services/sectionUrlService";
import { useSidebarContext } from "@/contexts/SidebarContext";
import { ChevronLeft, ChevronRight, LogOut, Music, Users } from "lucide-react";
import { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

// Definir las rutas disponibles
type AppRoute = Route<"/users" | "/hypnosis" | "/metrics" | "/login">;

type MenuItem = {
  name: string;
  icon: React.ElementType;
  path: AppRoute;
};

const menuItems: MenuItem[] = [
  {
    name: "Usuarios",
    icon: Users,
    path: "/users" as Route<"/users">,
  },
  {
    name: "Audios",
    icon: Music,
    path: "/audios" as Route<"/audios">,
  },
  // {
  //   name: 'Hipnosis',
  //   icon: Brain,
  //   path: '/hypnosis' as Route<'/hypnosis'>
  // },
  // {
  //   name: 'Métricas',
  //   icon: BarChart2,
  //   path: '/metrics' as Route<'/metrics'>
  // },
];

export default function SidebarNew() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, toggle } = useSidebarContext();

  const handleLogout = () => {
    try {
      logout();
      LocalStorageService.clearAll();
      router.push("/login" as Route<"/login">);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  };

  const handleNavigation = (path: AppRoute) => {
    // Guardar la URL actual antes de navegar
    const currentUrl = window.location.href;
    
    if (pathname.includes("/users")) {
      SectionUrlService.saveCurrentUrl("users", currentUrl);
    } else if (pathname.includes("/audios")) {
      SectionUrlService.saveCurrentUrl("audios", currentUrl);
    }

    // Verificar si hay una URL guardada para la sección destino
    const targetSection = path.includes('/users') ? 'users' : 'audios';
    const savedUrl = SectionUrlService.getSavedUrl(targetSection);
    
    if (savedUrl) {
      // Navegar a la URL guardada completa
      window.location.href = savedUrl;
    } else {
      // Navegar normalmente si no hay URL guardada
      router.push(path);
    }
  };
  const isRouteActive = (path: string): boolean => {
    if (path === "/users") {
      return pathname === "/users" || pathname.startsWith("/user/");
    }
    if (path === "/audios") {
      return pathname === "/audios" || pathname.startsWith("/audio/");
    }
    return pathname === path;
  };

  return (
    <>
      <aside
        className={`
          fixed left-0 top-0 h-screen z-40
          transition-all duration-300 ease-in-out
          bg-sidebar border-r border-sidebar-border
          ${isOpen ? "w-64" : "w-20"}
          ${!isOpen ? "lg:w-20 w-16" : "lg:w-64 w-64"}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className={`h-16 flex items-center justify-between border-b border-sidebar-border ${
              isOpen ? "px-5" : "px-2"
            }`}
          >
            <div className="flex items-center gap-2">
              {isOpen && (
                <img src="/logo.svg" alt="Logo" className="h-[40px]" />
              )}
            </div>
            <button
              onClick={toggle}
              className="p-2 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground transition-colors"
              aria-label={isOpen ? "Colapsar menú" : "Expandir menú"}
            >
              {!isOpen ? (
                <ChevronRight className="h-5 w-5" />
              ) : (
                <ChevronLeft className="h-5 w-5" />
              )}
            </button>
          </div>

          {/* Navigation */}
          <nav
            className={`flex-1 overflow-y-auto py-4 ${
              isOpen ? "px-4" : "px-2"
            }`}
          >
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;

                const isActive = isRouteActive(item.path);

                return (
                  <li key={item.path}>
                    <button
                      onClick={() => handleNavigation(item.path)}
                      className={`
                        w-full flex items-center gap-3 
                        px-3 py-2 rounded-lg
                        font-medium transition-colors
                        ${
                          isActive
                            ? "bg-sidebar-accent text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }
                        ${!isOpen ? "justify-center" : ""}
                      `}
                      title={!isOpen ? item.name : undefined}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {isOpen && (
                        <span className="hidden lg:inline sm:inline">
                          {item.name}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Footer */}
          <div
            className={`border-t border-sidebar-border ${
              isOpen ? "p-4" : "p-2"
            }`}
          >
            <button
              onClick={handleLogout}
              className={`
                w-full flex items-center gap-3 
                px-3 py-2 rounded-lg
                text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground
                font-medium transition-colors
                ${!isOpen ? "justify-center" : ""}
              `}
              title={!isOpen ? "Cerrar sesión" : undefined}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              {isOpen && (
                <span className="hidden lg:inline sm:inline">
                  Cerrar sesión
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay para móvil */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={toggle}
        />
      )}
    </>
  );
}
