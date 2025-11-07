"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation"; // ✅ AGREGAR useSearchParams
import { Suspense, useEffect, useState } from "react"; // ✅ 
// Servicios
import { LocalStorageService } from "@/app/_services/localStorageService";
import { membershipService } from "@/app/_services/membershipService";
import {
  createMmgUser,
  getDisplayPlanType,
  getRealCancellationDate,
  isTrialUser,
} from "@/app/_services/mmgUserService";

// Hooks
import { useUsers } from "@/hooks/useUsers";
import { useUserStats } from "@/hooks/useUserStats"; // Nuevo hook
import { useQueryClient } from '@tanstack/react-query'; // Agregar este import

// Componentes
import { Modal } from "@/components/modal/Modal";
import Avatar from "@/components/ui/avatar";
import GridDataView, { Column } from "@/components/ui/table/GridDataView";

// Utilidades
import { textStyles } from "@/app/styles/themes";
import { addMonths, addYears, formatUTCDateTime } from "@/app/utils/utils";

// Tipos
import { User as ApiUser } from "@/app/types/user";
import Alert from "@/components/alert/Alert";
// Interfaces locales
interface UserWithId extends ApiUser {
  _id: string;
  source: string;
  device: string | null;
  language?: "es" | "en";
  email: string; // Agregar email explícitamente
}

// Funciones auxiliares
const getSubscriptionType = (type: string): string => {
  if (!type) return "Mensual"; // Valor por defecto si type es undefined/null

  const normalizedType = type.toLowerCase();
  switch (normalizedType) {
    case "mensual":
    case "monthly":
      return "Mensual";
    case "anual":
    case "yearly":
      return "Anual";
    case "free":
      return "Free";
    case "trial":
      return "Trial";
    default:
      return "Mensual";
  }
};

// ✅ COMPONENTE SEPARADO PARA LA LÓGICA CON useSearchParams
function UsersContent() {
  // Estado para manejar hidratación
  const [isClient, setIsClient] = useState(false);

  const router = useRouter();
  const queryClient = useQueryClient();
  
  // ✅ LEER PARÁMETROS DE URL COMO FUENTE DE VERDAD
  const searchParams = useSearchParams();
  const paramsObj: { [key: string]: string } = {};

  for (let [key, value] of searchParams) {
    paramsObj[key] = value;
  }

  // ✅ INICIALIZAR ESTADOS DESDE URL PARAMS
  const [currentPage, setCurrentPage] = useState(parseInt(paramsObj.page) || 1);
  const [pageSize, setPageSize] = useState(parseInt(paramsObj.pageSize) || 5);
  const [query, setQuery] = useState(paramsObj.q || "");
  const [sortField, setSortField] = useState(paramsObj.sortField || "createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">((paramsObj.sortDirection as "asc" | "desc") || "desc");
  const [memberStatus, setMemberStatus] = useState<"all" | "active" | "trial">((paramsObj.memberStatus as "all" | "active" | "trial") || "all");
  const [userLevel, setUserLevel] = useState(paramsObj.userLevel || "");
  const [language, setLanguage] = useState<"es" | "en" | "all">((paramsObj.language as "es" | "en" | "all") || "all");

  // Estados para feedback visual de los botones basados en memberStatus
  const [isActiveButtonPressed, setIsActiveButtonPressed] = useState(paramsObj.memberStatus === "active");
  const [isTrialButtonPressed, setIsTrialButtonPressed] = useState(paramsObj.memberStatus === "trial");  
  const [isAllButtonPressed, setIsAllButtonPressed] = useState(!paramsObj.memberStatus || paramsObj.memberStatus === "all");

  // Estados para progress bar
  const [loadingProgress, setLoadingProgress] = useState<string>("");
  const [loadingDetails, setLoadingDetails] = useState<{
    loaded: number;
    total: number;
    percentage: number;
    isStreaming: boolean;
  }>({
    loaded: 0,
    total: 0,
    percentage: 0,
    isStreaming: false,
  });

  // Estados para el modal
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedUserRow, setSelectedUserRow] = useState<UserWithId | null>(
    null
  );

  

  const [alertState, setAlertState] = useState<{
    show: boolean;
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  // Estado para creación de usuarios
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [cancelling, setCancelling] = useState(false);
  const suscriptionIsReveue =
    selectedUserRow && Object.keys(selectedUserRow).includes("processorData");

  const showAlert = (type: "success" | "error" | "info", message: string) => {
    setAlertState({ show: true, type, message });
    setTimeout(() => setAlertState(null), 5000);
  };

  // ✅ FUNCIÓN PARA ACTUALIZAR URL PARAMS
  const updateSearchParams = (newParams: { [key: string]: string | number }) => {
    const updatedParams = { ...paramsObj };
    
    Object.entries(newParams).forEach(([key, value]) => {
      if (value && value !== "" && !(key === "page" && value === 1) && !(key === "pageSize" && value === 5)) {
        updatedParams[key] = value.toString();
      } else {
        delete updatedParams[key];
      }
    });

    const newSearchParams = new URLSearchParams(updatedParams);
    const newURL = `${window.location.pathname}${newSearchParams.toString() ? `?${newSearchParams.toString()}` : ''}`;
    window.history.replaceState({}, '', newURL);
  };

  // Estado para mantener información anterior mientras se carga
  const [previousPaginationInfo, setPreviousPaginationInfo] = useState<{
    totalPages: number;
    totalUsers: number;
  } | null>(null);

  // React Query para obtener usuarios
  const {
    data: usersResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useUsers({
    page: currentPage,
    pageSize,
    query,
    sortField,
    sortDirection,
    memberStatus,
    userLevel,
    language,
  });

  // React Query para obtener estadísticas de usuarios
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useUserStats();

  const users = usersResponse?.data || [];
  const totalPages = usersResponse?.metadata.totalPages || 1;

  // Mostrar skeleton cuando está fetching
  const showSkeleton = isFetching;

  // Guardar información de paginación cuando no está cargando
  useEffect(() => {
    if (usersResponse && !isFetching) {
      setPreviousPaginationInfo({
        totalPages: usersResponse.metadata.totalPages,
        totalUsers: usersResponse.metadata.total,
      });
    }
  }, [usersResponse, isFetching]);

  // Determinar qué información mostrar
  const displayTotalPages = isFetching && previousPaginationInfo 
    ? previousPaginationInfo.totalPages 
    : totalPages;

  const displayUserCount = isFetching && previousPaginationInfo
    ? Math.min(pageSize, previousPaginationInfo.totalUsers)
    : Math.min(pageSize, users.length);

  // Efecto para hidratación
  useEffect(() => {
    setIsClient(true);
    
    // Cargar datos guardados usando LocalStorageService
    if (typeof window !== "undefined") {
      const savedQuery = LocalStorageService.getValue("users", "query");
      if (savedQuery) {
        setQuery(savedQuery);
      }
      
      // Establecer el estado de los botones según memberStatus
      if (memberStatus === "trial") {
        setIsTrialButtonPressed(true);
      } else if (memberStatus === "active") {
        setIsActiveButtonPressed(true);
      } else {
        setIsAllButtonPressed(true);
      }
    }
  }, [isClient]);

  // ✅ EFECTOS PARA SINCRONIZAR ESTADOS CON URL PARAMS
  useEffect(() => {
    if (paramsObj.page) {
      setCurrentPage(parseInt(paramsObj.page));
    }
  }, [parseInt(paramsObj.page)]);

  useEffect(() => {
    if (paramsObj.pageSize) {
      setPageSize(parseInt(paramsObj.pageSize));
    }
  }, [parseInt(paramsObj.pageSize)]);

  useEffect(() => {
    if (paramsObj.q !== undefined) {
      setQuery(paramsObj.q);
    }
  }, [paramsObj.q]);

  useEffect(() => {
    if (paramsObj.sortField) {
      setSortField(paramsObj.sortField);
    }
  }, [paramsObj.sortField]);

  useEffect(() => {
    if (paramsObj.sortDirection) {
      setSortDirection(paramsObj.sortDirection as "asc" | "desc");
    }
  }, [paramsObj.sortDirection]);

  useEffect(() => {
    if (paramsObj.memberStatus) {
      setMemberStatus(paramsObj.memberStatus as "all" | "active" | "trial");
      setIsActiveButtonPressed(paramsObj.memberStatus === "active");
      setIsTrialButtonPressed(paramsObj.memberStatus === "trial");
      setIsAllButtonPressed(paramsObj.memberStatus === "all");
    }
  }, [paramsObj.memberStatus]);

  useEffect(() => {
    if (paramsObj.userLevel !== undefined) {
      setUserLevel(paramsObj.userLevel);
    }
  }, [paramsObj.userLevel]);

  useEffect(() => {
    if (paramsObj.language) {
      setLanguage(paramsObj.language as "es" | "en" | "all");
    }
  }, [paramsObj.language]);

  // ✅ ACTUALIZAR URL CUANDO CAMBIEN LOS ESTADOS
  useEffect(() => {
    updateSearchParams({ page: currentPage });
  }, [currentPage]);

  useEffect(() => {
    updateSearchParams({ pageSize });
  }, [pageSize]);

  useEffect(() => {
    updateSearchParams({ q: query });
  }, [query]);

  useEffect(() => {
    updateSearchParams({ sortField, sortDirection });
  }, [sortField, sortDirection]);

  useEffect(() => {
    updateSearchParams({ memberStatus });
  }, [memberStatus]);

  useEffect(() => {
    updateSearchParams({ userLevel });
  }, [userLevel]);

  useEffect(() => {
    updateSearchParams({ language });
  }, [language]);

  // Manejar errores de React Query
  useEffect(() => {
    if (error) {
      console.error("Error al obtener usuarios:", error);
      showAlert("error", "Error al buscar usuarios. Intenta de nuevo.");
    }
  }, [error]);

  // Manejar errores de estadísticas
  useEffect(() => {
    if (statsError) {
      console.error("Error al obtener estadísticas:", statsError);
      showAlert("error", "Error al cargar estadísticas. Intenta de nuevo.");
    }
  }, [statsError]);



  // Guardar en caché cuando cambian los datos
  useEffect(() => {
    if (usersResponse && typeof window !== "undefined") {
      try {
        LocalStorageService.setValue("users", "pageSize", pageSize.toString());
        const cacheData = {
          data: users,
          totalPages,
          timestamp: Date.now(),
          pageSize,
          memberStatus,
        };
        sessionStorage.setItem("usersCache", JSON.stringify(cacheData));
      } catch (error) {
        console.warn("No se pudo guardar usuarios en caché:", error);
      }
    }
  }, [usersResponse, users, totalPages, pageSize, memberStatus]);

  // ✅ FUNCIONES ACTUALIZADAS PARA BOTONES
  const showAllUsers = () => {
    setMemberStatus("all");
    setCurrentPage(1);
  };

  const showActiveUsers = () => {
    setMemberStatus("active");
    setCurrentPage(1);
  };

  const showTrialUsers = () => {
    setMemberStatus("trial");
    setCurrentPage(1);
  };

  const handleSort = (field: string, direction: "asc" | "desc") => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleNewTab = (user: UserWithId) => {
    window.open(
      window.location.href.split("/")[0] + `/user/${user._id}`,
      "_blank"
    );
  };

  // Manejadores de eventos
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleViewUser = (user: UserWithId): void => {
    router.push(`/user/${user._id}`);
  };

  const getMembershipStatus = (
    lastMembership:
      | {
          membershipId: string;
          membershipDate: string;
          membershipPaymentDate: string;
          type: string;
        }
      | undefined
  ): string => {
    if (!isClient) return "Cargando..."; // Evitar problemas de hidratación

    if (!lastMembership?.membershipId) {
      return "Cancelada";
    }

    // Normalizar el tipo de membresía para manejar ambos formatos
    if (!lastMembership.type) {
      return "Cancelada";
    }

    const normalizedType = lastMembership.type.toLowerCase();
    const currentDate = new Date();

    switch (normalizedType) {
      case "mensual":
      case "monthly":
        // Para mensual, sumar 1 mes respetando fin de mes
        if (lastMembership.membershipDate) {
          const paymentDate = new Date(lastMembership.membershipDate);
          const expirationDate = addMonths(paymentDate, 1);
          return expirationDate >= currentDate ? "Activa" : "Cancelada";
        } else {
          const membershipDate = new Date(
            lastMembership.membershipDate.split("T")[0]
          );
          const expirationDate = addMonths(membershipDate, 1);
          return expirationDate > currentDate ? "Activa" : "Cancelada";
        }
      case "anual":
      case "yearly":
        // Para anual, sumar 1 año
        if (lastMembership.membershipDate) {
          const paymentDate = new Date(
            lastMembership.membershipDate.split("T")[0]
          );
          const expirationDate = addYears(paymentDate, 1);
          return expirationDate >= currentDate ? "Activa" : "Cancelada";
        } else {
          const membershipDate = new Date(
            lastMembership.membershipDate.split("T")[0]
          );
          const expirationDate = addYears(membershipDate, 1);
          return expirationDate > currentDate ? "Activa" : "Cancelada";
        }
      case "free":
        return "Activa"; // Free siempre activo
      case "trial":
        return "Trial";
      default:
        return "Cancelada";
    }
  };

  const handleCreateUser = async () => {
    setIsCreatingUser(true);
    setCreateError(null);

    try {
      const newUser = {
        email: "newuser@example.com",
        names: "Usuario",
        lastnames: "Nuevo",
        wantToBeCalled: "Usuario",
        gender: "no especificado",
        birthdate: new Date().toISOString(),
        cellphone: "",
        userLevel: null,
        source: "admin-created",
        language: "es" as const,
      };

      await createMmgUser(newUser);

      // Cerrar modal y limpiar formulario
      setShowCreateForm(false);

      // Recargar usuarios e invalidar cache de estadísticas
      refetch();
      queryClient.invalidateQueries({ queryKey: ['userStats'] });
    } catch (error) {
      console.error("Error creating user:", error);
      setCreateError(
        error instanceof Error ? error.message : "Error al crear usuario"
      );
    } finally {
      setIsCreatingUser(false);
    }
  };

  // Definir las opciones de tamaño de página
  const pageSizeOptions = [5, 10, 25, 50];

  // Manejador unificado para cambio de tamaño de página
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    updateSearchParams({ pageSize: newSize });
    if (typeof window !== "undefined") {
      LocalStorageService.setValue("users", "pageSize", newSize.toString());
    }
  };

  // Componente Select reutilizable para tamaño de página
  const PageSizeSelector = () => (
    <select
      value={pageSize}
      onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
      className="appearance-none bg-background border border-border rounded-md pl-3 pr-8 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
    >
      {pageSizeOptions.map((size) => (
        <option key={size} value={size}>
          {size} registros
        </option>
      ))}
    </select>
  );

  // Funciones auxiliares para avatar y colores
  const getInitials = (name: string, email?: string) => {
    if (
      name &&
      name.trim() &&
      name.trim() !== "undefined undefined" &&
      name.trim() !== "null null"
    ) {
      return name
        .trim()
        .split(" ")
        .filter((part) => part && part.length > 0)
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }

    if (email && email.includes("@")) {
      const emailPart = email.split("@")[0];
      if (emailPart.length >= 2) {
        return emailPart.substring(0, 2).toUpperCase();
      } else if (emailPart.length === 1) {
        return (emailPart + email.split("@")[1][0]).toUpperCase();
      }
    }

    return "U?";
  };

  const getBackgroundColor = (name: string, email?: string) => {
    return "#000000";
  };

  // Función de búsqueda unificada
  const handleSearch = async (searchTerm: string) => {
    setQuery(searchTerm);
    setCurrentPage(1);
    updateSearchParams({ q: searchTerm });
    
    // Guardar usando LocalStorageService
    if (typeof window !== "undefined") {
      LocalStorageService.setValue("users", "query", searchTerm);
    }
  };

  // Columnas específicas para usuarios trial
  const trialColumns: Column<UserWithId>[] = [
    {
      field: "names",
      header: "USUARIO",
      filterable: true,
      render: (value, row) => {
        const fullName = `${row.names} ${row.lastnames}`;
        const initials = getInitials(fullName, row.email);
        const bgColor = getBackgroundColor(fullName, row.email);

        return (
          <div className="flex items-center gap-1 w-full min-w-0">
            <div
              className="w-5 h-5 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: bgColor }}
            >
              <span className="text-white font-medium text-[7px] sm:text-xs">
                {initials}
              </span>
            </div>
            <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
              <span className="font-bold text-foreground text-[8px] sm:text-xs truncate block">
                {fullName}
              </span>
              <span className="text-muted-foreground text-[7px] sm:text-xs truncate block">
                {row.email}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: "_id",
      header: "ID",
      filterable: true,
      render: (value) => {
        const idStr = value as string;
        return (
          <span
            className="text-[7px] sm:text-[12px] font-mono cursor-pointer hover:bg-accent px-0.5 py-0.5 rounded block break-all"
            title={idStr}
          >
            {idStr}
          </span>
        );
      },
    },
    {
      field: "lastMembership.type",
      header: "PLAN",
      render: (value, row) => {
        const displayType = getDisplayPlanType(row as unknown as any);
        return (
          <span className="text-[7px] sm:text-[11px] cursor-pointer block truncate text-orange-600 font-semibold">
            <span className="sm:hidden">T</span>
            <span className="hidden sm:inline">{displayType}</span>
          </span>
        );
      },
    },
    {
      field: "userLevel", 
      header: "NIVEL",
      headerMobile: "NIV",
      render: (value, row) => {
        if (value) {
          return (
            <span className="text-[7px] sm:text-[11px] cursor-pointer block truncate text-purple-600 font-semibold">
              <span className="hidden sm:inline">{row.userLevel}</span>
            </span>
          );
        }
        return (
          <span className="text-[7px] sm:text-[11px] cursor-pointer block truncate text-gray-400">
            <span className="sm:hidden">-</span>
            <span className="hidden sm:inline">Sin nivel</span>
          </span>
        );
      },
    },
    {
      field: "lastMembership.membershipDate",
      header: "INICIO DE MEMBRESÍA",
      headerMobile: "INICIO",
      render: (value, row) => {
        const membershipDate = row.lastMembership?.membershipDate;
        if (!membershipDate) return "-";

        const fullDate = formatUTCDateTime(membershipDate);
        const shortDate = fullDate.split(" ")[0];
        const veryShortDate = shortDate.split("-").slice(1).join("/");
        return (
          <span
            className="text-[7px] sm:text-[11px] cursor-pointer block truncate"
            title={fullDate}
          >
            <span className="sm:hidden">{veryShortDate}</span>
            <span className="hidden sm:inline">{shortDate}</span>
          </span>
        );
      },
    },
    {
      field: "cancellationDate",
      header: "FECHA DE CANCELACIÓN",
      headerMobile: "CANCELADO",
      render: (value, row) => {
        // Intentar obtener fecha real desde caché de cancelados
        const cancellationDate = getRealCancellationDate(row as unknown as any);

        // Si no hay fecha real, usar fallback de +7 días desde inicio de membresía
        let finalCancellationDate = cancellationDate;
        if (!finalCancellationDate && row.lastMembership?.membershipDate) {
          const membershipDate = new Date(row.lastMembership.membershipDate);
          const trialEndDate = new Date(
            membershipDate.getTime() + 7 * 24 * 60 * 60 * 1000
          );
          finalCancellationDate = trialEndDate.toISOString();
        }

        if (!finalCancellationDate) return "-";

        const fullDate = formatUTCDateTime(finalCancellationDate);
        const shortDate = fullDate.split(" ")[0];
        const veryShortDate = shortDate.split("-").slice(1).join("/");

        const now = new Date();
        const cancellation = new Date(finalCancellationDate);
        const isCancelled = cancellation < now;
        const daysFromCancellation = Math.ceil(
          (cancellation.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <span
            className={`text-[7px] sm:text-[11px] cursor-pointer block truncate ${
              isCancelled
                ? "text-red-600 font-bold"
                : daysFromCancellation <= 2
                ? "text-orange-600 font-semibold"
                : "text-foreground"
            }`}
            title={`${fullDate} ${
              isCancelled
                ? "(Cancelado)"
                : `(Se cancela en ${daysFromCancellation} días)`
            }`}
          >
            <span className="sm:hidden">{veryShortDate}</span>
            <span className="hidden sm:inline">{shortDate}</span>
            {!isCancelled && daysFromCancellation <= 3 && (
              <span className="ml-1 text-[6px] sm:text-[8px]">
                ({daysFromCancellation}d)
              </span>
            )}
          </span>
        );
      },
    },
    {
      field: "createdAt",
      header: "REGISTRO DE LA CUENTA",
      headerMobile: "CUENTA",
      render: (value) => {
        const fullDate = formatUTCDateTime(value as string);
        const shortDate = fullDate.split(" ")[0];
        const veryShortDate = shortDate.split("-").slice(1).join("/");
        return (
          <span
            className="text-[7px] sm:text-[11px] cursor-pointer block truncate"
            title={fullDate}
          >
            <span className="sm:hidden">{veryShortDate}</span>
            <span className="hidden sm:inline">{shortDate}</span>
          </span>
        );
      },
    },
    {
      field: "email",
      header: "ACCIONES",
      headerMobile: "ACC",
      render: (value, row) => {
        // Mostrar botón para usuarios trial O activos
        const isTrialUserCheck = isTrialUser(row as unknown as any);
        const hasActiveMembership =
          getMembershipStatus(row.lastMembership) === "Activa";

        if (
          isClient &&
          row.email &&
          (isTrialUserCheck || hasActiveMembership)
        ) {
          return (
            <div className="w-full flex justify-center">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setSelectedUserRow(row);
                  setShowCancelModal(true);
                }}
                disabled={cancelling}
                className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-[9px] sm:text-[12px] px-2 py-1 rounded min-w-0 font-medium transition-colors"
                title={`Cancelar suscripción de ${row.email}`}
              >
                Cancelar suscripción
              </button>
            </div>
          );
        }
        return (
          <span className="text-gray-400 text-[7px] sm:text-[11px] block text-center">
            -
          </span>
        );
      },
    },
    {
      field: "device",
      header: "DISPOSITIVO",
      headerMobile: "DEV",
      render: (value, row) => {
        // ✅ Verificación segura de tipos
        const deviceValue = value === null || value === undefined ? "" : String(value);
        const device = deviceValue.toLowerCase();
        
        let displayText = "";
        let color = "";

        if (device.includes("ios") || device.includes("iphone") || device.includes("ipad")) {
          displayText = "iOS";
          color = "text-gray-600";
        } else if (device.includes("android")) {
          displayText = "Android";
          color = "text-green-600";
        } else if (device.includes("web") || device.includes("browser")) {
          displayText = "Web";
          color = "text-blue-600";
        } else if (device && device.trim() !== "") {
          displayText = deviceValue; // Usar el valor original
          color = "text-gray-600";
        } else {
          displayText = "-";
          color = "text-gray-400";
        }

        return (
          <span
            className={`text-[7px] sm:text-[11px] cursor-pointer block truncate ${color} font-medium`}
            title={deviceValue || "Sin dispositivo"}
          >
            <span className="sm:hidden">{displayText.charAt(0)}</span>
            <span className="hidden sm:inline">{displayText}</span>
          </span>
        );
      },
    },
    {
      field: "language",
      header: "IDIOMA",
      headerMobile: "IDI",
      render: (value, row) => {
        const language = value as string;
        let displayText = "";
        let color = "";

        if (language === "es") {
          displayText = "Español";
          color = "text-blue-600";
        } else if (language === "en") {
          displayText = "English";
          color = "text-green-600";
        } else {
          displayText = "-";
          color = "text-gray-400";
        }

        return (
          <span
            className={`text-[7px] sm:text-[11px] cursor-pointer block truncate ${color} font-medium`}
            title={language || "Sin idioma"}
          >
            <span className="sm:hidden">{displayText.charAt(0)}</span>
            <span className="hidden sm:inline">{displayText}</span>
          </span>
        );
      },
    },
  ];

  // Definición de columnas
  const columns: Column<UserWithId>[] = [
    {
      field: "names",
      header: "USUARIOS",
      filterable: true,
      render: (value, row) => (
        <Avatar
          imageUrl="/user.svg"
          name={`${row.names} ${row.lastnames}`}
          email={row.email as string}
        />
      ),
    },
    {
      field: "_id",
      header: "ID",
      filterable: true,
      render: (value, row) => {
        return <span className="text-[14px]">{value as string}</span>;
      },
    },
    {
      field: "lastMembership.type",
      header: "PLAN",
      render: (value, row) => {
        return (
          <span className="text-[14px]">
            {getSubscriptionType(row.lastMembership?.type)}
          </span>
        );
      },
    },
    {
      field: "userLevel",
      header: "NIVEL",
      render: (value, row) => {
        
        if (value && typeof value === "string") {
          return (
            <span className="inline-flex items-center justify-center w-[142px] px-4 py-2.5 rounded-[24px] text-[14px] font-semibold bg-purple-100 text-purple-700 m-0">
              {value}
            </span>
          );
        }
        
        return (
                      <span className="inline-flex items-center justify-center w-[142px] px-4 py-2.5 rounded-[24px] text-[14px] font-semibold bg-gray-100 text-gray-500 m-0">
              Sin nivel
            </span>
        );
      },
    },
    {
      field: "lastMembership.membershipDate",
      header: "SUSCRIPCIÓN",
      render: (value, row) => {
        const membershipStatus = getMembershipStatus(row.lastMembership);
        const isActive = membershipStatus === "Activa";
        
        return (
          <span className={`inline-flex items-center justify-center w-[142px] px-4 py-2.5 rounded-[24px] text-[14px] font-semibold m-0 ${
            isActive 
              ? "bg-green-100 text-green-700" 
              : "bg-red-100 text-red-700"
          }`}>
            {membershipStatus}
          </span>
        );
      },
    },
    {
      field: "source",
      header: "FUENTE",
      render: (value, row) => {
        const source = (value as string)?.toLowerCase() || "";
        const processor = (row.processor as string)?.toLowerCase() || "";
        let displayText = "";
        let bgColor = "";
        let textColor = "";

        // Normalizar las fuentes a solo 4 opciones
        if (
          source.includes("app_store") ||
          source.includes("apple") ||
          source === "ios"
        ) {
          displayText = "iOS";
          bgColor = "bg-[#adadad]";
          textColor = "text-[#383838]";
        } else if (
          source.includes("play_store") ||
          source.includes("google") ||
          source === "android"
        ) {
          displayText = "Android";
          bgColor = "bg-[#d2fecc]";
          textColor = "text-[#326830]";
        } else if (source.includes("paypal") || processor.includes("paypal")) {
          displayText = "PayPal";
          bgColor = "bg-[#c2ddfd]";
          textColor = "text-[#2246d8]";
        } else {
          // Si no es ninguna de las anteriores, mostrar como Stripe
          displayText = "Stripe";
          bgColor = "bg-[#eecbff]";
          textColor = "text-[#ac2bad]";
        }

        return (
          <span
            className={`inline-flex items-center justify-center w-[142px] px-4 py-2.5 rounded-[24px] text-[14px] font-semibold m-0 ${bgColor} ${textColor}`}
          >
            {displayText}
          </span>
        );
      },
    },
    // ✅ COLUMNA DEVICE CORREGIDA
    {
      field: "device",
      header: "DISPOSITIVO",
      render: (value, row) => {
        // ✅ Verificación segura de tipos
        const deviceValue = value === null || value === undefined ? "" : String(value);
        const device = deviceValue.toLowerCase();
        
        let displayText = "";
        let bgColor = "";
        let textColor = "";

        if (device.includes("ios") || device.includes("iphone") || device.includes("ipad")) {
          displayText = "iOS";
          bgColor = "bg-[#f0f0f0]";
          textColor = "text-[#333333]";
        } else if (device.includes("android")) {
          displayText = "Android";
          bgColor = "bg-[#e8f5e8]";
          textColor = "text-[#2e7d32]";
        } else if (device.includes("web") || device.includes("browser")) {
          displayText = "Web";
          bgColor = "bg-[#e3f2fd]";
          textColor = "text-[#1976d2]";
        } else if (device && device.trim() !== "") {
          displayText = deviceValue; // Usar el valor original, no el lowercased
          bgColor = "bg-[#fafafa]";
          textColor = "text-[#666666]";
        } else {
          displayText = "Sin dispositivo";
          bgColor = "bg-[#fafafa]";
          textColor = "text-[#999999]";
        }

        return (
          <span
            className={`inline-flex items-center justify-center w-[142px] px-4 py-2.5 rounded-[24px] text-[14px] font-semibold m-0 ${bgColor} ${textColor}`}
          >
            {displayText}
          </span>
        );
      },
    },
    {
      field: "language",
      header: "IDIOMA",
      render: (value, row) => {
        const language = value as string;
        let displayText = "";
        let bgColor = "";
        let textColor = "";

        if (language === "es") {
          displayText = "Español";
          bgColor = "bg-[#e3f2fd]";
          textColor = "text-[#1976d2]";
        } else if (language === "en") {
          displayText = "English";
          bgColor = "bg-[#e8f5e8]";
          textColor = "text-[#2e7d32]";
        } else {
          displayText = "Sin idioma";
          bgColor = "bg-[#fafafa]";
          textColor = "text-[#999999]";
        }

        return (
          <span
            className={`inline-flex items-center justify-center w-[142px] px-4 py-2.5 rounded-[24px] text-[14px] font-semibold m-0 ${bgColor} ${textColor}`}
          >
            {displayText}
          </span>
        );
      },
    },
    {
      field: "createdAt",
      header: "CREADO EN",
      render: (value) => (
        <span className="text-[14px]">
          {formatUTCDateTime(value as string)}
        </span>
      ),
    },
    {
      field: "email",
      header: "ACCIONES",
      render: (value, row) => {
        // Mostrar botón si tiene membresía activa O es usuario trial
        const hasActiveMembership =
          getMembershipStatus(row.lastMembership) === "Activa";
        const isTrialUserCheck =
          isTrialUser && isTrialUser(row as unknown as any);

        if (
          isClient &&
          row.email &&
          (hasActiveMembership || isTrialUserCheck)
        ) {
          return (
            <div className="w-full flex justify-center">
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  setSelectedUserRow(row); // Guardar los datos del usuario
                  setShowCancelModal(true); // Mostrar el modal
                }}
                disabled={cancelling}
                className="bg-black hover:bg-gray-800 disabled:opacity-50 text-white text-[14px] px-3 py-1 rounded font-medium transition-colors"
                title={`Cancelar suscripción de ${row.email}`}
              >
                Cancelar suscripción
              </button>
            </div>
          );
        }
        return (
          <span className="text-gray-400 text-[14px] block text-center">-</span>
        );
      },
    },
  ];

  // Mostrar loading hasta que el cliente esté listo
  if (!isClient) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className={`${textStyles.h1} negative-letter-spacing`}>
            Usuarios
          </h1>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  function setCancelAtPeriodEnd(checked: boolean): void {
    throw new Error("Function not implemented.");
  }

  // Renderizado
  return (
    <>
      <div className="space-y-3 sm:space-y-6 px-2 sm:px-0">
        {alertState?.show && (
          <div className="fixed top-4 right-4 z-[9999] w-96">
            <Alert
              variant={alertState.type}
              title={alertState.type === "success" ? "¡Éxito!" : alertState.type === "info" ? "Información" : "Error"}
              description={alertState.message}
              onClose={() => setAlertState(null)}
            />
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <h1
            className={`${textStyles.h1} negative-letter-spacing`}
          >
            Usuarios
          </h1>
        </div>
        {/* Modal para crear usuario */}
        {showCreateForm && (
          <Modal onClose={() => setShowCreateForm(false)}>
            <div className="w-[600px] bg-card rounded-[20px] p-4">
              <div className="flex justify-start mb-4">
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-black"
                >
                  <svg
                    className="w-6 h-6 bg-black rounded-full"
                    fill="none"
                    stroke="white"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="px-8 py-4">
                <h2 className="text-[30px] font-extrabold text-center mb-8">
                  Crear usuario nuevo
                </h2>

                {createError && (
                  <p className="text-red-500 text-center mb-4">{createError}</p>
                )}

                <div className="flex justify-center">
                  <button
                    onClick={handleCreateUser}
                    disabled={isCreatingUser}
                    className={`w-[300px] bg-black text-white py-4 rounded-xl font-bold hover:bg-gray-900 transition ${
                      isCreatingUser ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    {isCreatingUser ? "Creando..." : "Confirmar"}
                  </button>
                </div>
              </div>
            </div>
          </Modal>
        )}

        {/* Tarjetas de estadísticas */}
        <div className="space-y-4">
          {/* Información general */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Total de activos históricos:</span>{" "}
              <span className="text-purple-600 font-semibold">
                {statsLoading 
                  ? "..." 
                  : (stats?.totalActives || 0).toLocaleString("es-ES")
                }
              </span>
            </div>
          </div>
          
          {/* Tarjetas de filtros */}
          <div className="grid grid-cols-3 gap-4">
            <div
              onClick={showAllUsers}
              className={`bg-white rounded-lg p-6 shadow-strong cursor-pointer transition-all duration-200 ${
                memberStatus === "all"
                  ? "ring-2 ring-blue-500"
                  : "hover:shadow-xl"
              } ${isAllButtonPressed ? "transform scale-95 bg-blue-50" : ""}`}
            >
              <div className="text-gray-500 text-lg font-medium">Todos</div>
              <div className="text-black text-[40px] font-display font-normal">
                {statsLoading 
                  ? "..." 
                  : (stats?.total || 0).toLocaleString("es-ES")
                }
              </div>
            </div>

            <div
              onClick={showActiveUsers}
              className={`bg-white rounded-lg p-6 shadow-strong cursor-pointer transition-all duration-200 ${
                memberStatus === "active"
                  ? "ring-2 ring-green-500"
                  : "hover:shadow-xl"
              } ${isActiveButtonPressed ? "transform scale-95 bg-green-50" : ""}`}
            >
              <div className="text-gray-500 text-lg font-medium">Activos</div>
              <div className={`text-[40px] font-display font-normal ${
                memberStatus === "active" 
                  ? "text-[#188554]" 
                  : memberStatus !== "all" 
                    ? "text-black" 
                    : "text-[#188554]"
              }`}>
                {statsLoading 
                  ? "..." 
                  : (stats?.active || 0).toLocaleString("es-ES")
                }
              </div>
            </div>

            <div
              onClick={showTrialUsers}
              className={`bg-white rounded-lg p-6 shadow-strong cursor-pointer transition-all duration-200 ${
                memberStatus === "trial"
                  ? "ring-2 ring-orange-500"
                  : "hover:shadow-xl"
              } ${isTrialButtonPressed ? "transform scale-95 bg-orange-50" : ""}`}
            >
              <div className="text-gray-500 text-lg font-medium">Trial</div>
              <div className={`text-[40px] font-display font-normal ${
                memberStatus === "trial" 
                  ? "text-orange-600" 
                  : memberStatus !== "all" 
                    ? "text-black" 
                    : "text-orange-600"
              }`}>
                {statsLoading 
                  ? "..." 
                  : (stats?.trial || 0).toLocaleString("es-ES")
                }
              </div>
            </div>
          </div>
        </div>

        {/* Grid de usuarios */}
        <div className="bg-card rounded-[20px] p-3 sm:p-6">

        <GridDataView<UserWithId>
          data={users}
          columns={columns}
          actions={[]}
          isLoading={showSkeleton}
          loadingText="Cargando usuarios..."
          defaultSortField={sortField} // ✅ AGREGAR
          defaultSortDirection={sortDirection} // ✅ AGREGAR
          searchFunction={async (query: string) => {
            await handleSearch(query);
            return users;
          }}
          initialSearchValue={query} // ✅ AGREGAR
          onRowClick={handleViewUser}
          onNewTab={handleNewTab}
          showSearch={true}
          onSortChange={(field: keyof UserWithId, direction: "asc" | "desc") => handleSort(field as string, direction)}
          limit={pageSize}
          additionalFilters={
            <div className="flex items-center gap-3 p-2">
              <div className="relative">
                <select
                  id="userLevel"
                  value={userLevel}
                  onChange={(e) => setUserLevel(e.target.value)}
                  className="appearance-none bg-background border border-border border-l-0 rounded-md pl-5 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground min-w-[140px] shadow-md shadow-black/20"
                > 
                <option value="">Nivel del usuario</option>
                {
                  Array.from({length: 30}, (_, i) => (
                    <option key={i} value={i + 1}>Nivel {i + 1}</option>
                  ))
                }
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
              <div className="relative">
                <select
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value as "es" | "en" | "all")}
                  className="appearance-none bg-background border border-border border-l-0 rounded-md pl-5 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground min-w-[140px] shadow-md shadow-black/20"
                > 
                <option value="all">Idioma del usuario</option>
                <option value="es">Español</option>
                <option value="en">Inglés</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                  <svg
                    className="fill-current h-4 w-4"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                  </svg>
                </div>
              </div>
            </div>
          }
        />
        </div>

        {/* Paginación */}
        <div className="flex justify-between items-center">
          <div className="flex-grow flex justify-center">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="pageSize"
                    className="text-xs sm:text-sm text-muted-foreground"
                  >
                    Mostrar:
                  </label>
                  <PageSizeSelector />
                </div>
              </div>
              <div className="flex justify-center sm:flex-grow">
                {totalPages > 0 && (
                  <div className="flex gap-2 items-center">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-2 sm:px-3 py-1 disabled:opacity-20 text-foreground hover:bg-accent rounded transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-foreground">
                      Página {currentPage} de {displayTotalPages} •{" "}
                      {displayUserCount} usuarios
                    </span>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-2 sm:px-3 py-1 disabled:opacity-20 text-foreground hover:bg-accent rounded transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      {showCancelModal && (
        <Modal onClose={() => setShowCancelModal(false)}>
          <div className="w-[500px] bg-white rounded-lg p-6">
            <h2 className="text-xl font-bold mb-4">Cancelar Suscripción</h2>
            <p>
              ¿Estás seguro de que quieres cancelar la suscripción de{" "}
              {suscriptionIsReveue ? "de RevenueCat" : "Stripe"} de{" "}
              {selectedUserRow?.email}?
            </p>

            {!suscriptionIsReveue && (
              <label className="flex items-center gap-2 text-sm mt-2 mb-2 font-medium ">
                <input
                  type="checkbox"
                  checked={false}
                  onChange={(e) => {/* handle checkbox */}}
                />
                Cancelar al final del periodo
              </label>
            )}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const bodyToSend = suscriptionIsReveue
                    ? {
                        email: selectedUserRow?.email,
                      }
                    : {
                        email: selectedUserRow?.email,
                        cancelAtPeriodEnd: false,
                      };
                  try {
                    await membershipService.cancelMembership(bodyToSend);
                    showAlert(
                      "success",
                      `Suscripción de ${selectedUserRow?.email} cancelada exitosamente`
                    );
                    refetch();
                    queryClient.invalidateQueries({ queryKey: ['userStats'] }); // Invalidar cache
                  } catch (error: any) {
                    console.error("Error al cancelar:", error);
                    showAlert(
                      "error",
                      `Error al cancelar suscripción: ${error.message}`
                    );
                  } finally {
                    setShowCancelModal(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Confirmar Cancelación
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

// ✅ COMPONENTE PRINCIPAL QUE ENVUELVE CON SUSPENSE
export default function UsersPage() {
  return (
    <Suspense fallback={
      <div className="p-6 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <UsersContent />
    </Suspense>
  );
}
