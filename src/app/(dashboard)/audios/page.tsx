"use client";

import { textStyles } from "@/app/styles/themes";
import { AudioRequest } from "@/app/types/audioRequest";
import StatusBadge from "@/components/ui/StatusBadge";
import GridDataView, { Column } from "@/components/ui/table/GridDataView";
import { useAudios } from "@/hooks/useAudios";
import { useAudioStats } from "@/hooks/useAudioStats";
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react"; // ✅ 
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

interface UnifiedAudioRequest extends AudioRequest {
  imageUrl?: string;
  formattedDuration?: string;
  customData?: any;
  userLevel?: string;
}

// Componente de tarjeta de estadísticas actualizado
const StatsCard = ({
  label,
  value,
  color,
  status,
  onClick,
  isSelected,
  isDataFiltered,
  isPressed = false,
  isLoading = false,
}: {
  label: string;
  value: string | number;
  color?: string;
  status: string;
  onClick: (status: string) => void;
  isSelected: boolean;
  isDataFiltered: boolean;
  isPressed?: boolean;
  isLoading?: boolean;
}) => {
  // Determinar colores basados en el estado
  const getRingColor = () => {
    if (!isSelected) return "";
    
    switch (status.toLowerCase()) {
      case "sended": return "ring-blue-500";
      case "error": return "ring-red-500";
      case "review": return "ring-yellow-500";
      case "pending": return "ring-purple-500";
      case "completed": return "ring-gray-500";
      default: return "ring-blue-500";
    }
  };

  const getPressedBackground = () => {
    switch (status.toLowerCase()) {
      case "sended": return "bg-blue-50";
      case "error": return "bg-red-50";
      case "review": return "bg-yellow-50";
      case "pending": return "bg-purple-50";
      case "completed": return "bg-gray-50";
      default: return "bg-blue-50";
    }
  };

  const getTextColor = () => {
    // Aplicar colores cuando está seleccionada O cuando no hay filtros activos
    if (isSelected || !isDataFiltered) {
      switch (status.toLowerCase()) {
        case "error": return "text-red-500";
        case "review": return "text-yellow-500";
        case "pending": return "text-purple-500";
        case "completed": return "text-gray-400";
        case "sended":
        default:
          return "text-blue-500";
      }
    }
    return "text-black";
  };

  return (
    <div
      className={`bg-white rounded-lg p-6 shadow-strong cursor-pointer transition-all duration-200 ${
        isSelected
          ? `ring-2 ${getRingColor()}`
          : "hover:shadow-xl"
      } ${(isPressed && isLoading) ? `transform scale-95 ${getPressedBackground()}` : ""}`}
      onClick={() => onClick(isSelected ? "" : status)}
    >
      <div className="text-gray-500 text-lg font-medium">{label}</div>
      <div className={`text-[40px] font-display font-normal ${getTextColor()}`}>
        {typeof value === "number" ? value.toLocaleString("es-ES") : value}
      </div>
    </div>
  );
};

// ✅ COMPONENTE SEPARADO PARA LA LÓGICA CON useSearchParams
function AudiosContent() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  // ✅ LEER PARÁMETROS DE URL COMO FUENTE DE VERDAD
  const searchParams = useSearchParams();
  const paramsObj: { [key: string]: string } = {};

  for (let [key, value] of searchParams) {
    paramsObj[key] = value;
  }

  // ✅ INICIALIZAR ESTADOS DESDE URL PARAMS (usando "email" en lugar de "q")
  const [currentPage, setCurrentPage] = useState(parseInt(paramsObj.page) || 1);
  const [itemsPerPage, setItemsPerPage] = useState(parseInt(paramsObj.pageSize) || 5);
  const [query, setQuery] = useState(paramsObj.email || ""); // ✅ USAR "email" para el buscador
  const [status, setStatus] = useState(paramsObj.status || "");
  const [userLevel, setUserLevel] = useState(paramsObj.userLevel || "");
  const [sortField, setSortField] = useState<keyof UnifiedAudioRequest>((paramsObj.sortField as keyof UnifiedAudioRequest) || "requestDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">((paramsObj.sortDirection as "asc" | "desc") || "desc");

  // Estado para mantener información anterior mientras se carga
  const [previousPaginationInfo, setPreviousPaginationInfo] = useState<{
    totalPages: number;
    totalAudios: number;
  } | null>(null);

  // Estados para efectos de presión (basados en status)
  const [isSendedPressed, setIsSendedPressed] = useState(paramsObj.status === "sended");
  const [isErrorPressed, setIsErrorPressed] = useState(paramsObj.status === "error");
  const [isReviewPressed, setIsReviewPressed] = useState(paramsObj.status === "review");
  const [isPendingPressed, setIsPendingPressed] = useState(paramsObj.status === "pending");
  const [isCompletedPressed, setIsCompletedPressed] = useState(paramsObj.status === "completed");

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

  // React Query para obtener audios
  const {
    data: audiosResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useAudios({
    page: currentPage,
    pageSize: itemsPerPage,
    query,
    sortField: sortField.toString(),
    sortDirection,
    status,
    userLevel,
  });

  // React Query para obtener estadísticas de audios
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useAudioStats();

  const audioRequests = audiosResponse?.data || [];
  const totalPages = audiosResponse?.metadata.totalPages || 1;

  // Mostrar skeleton cuando está fetching
  const showSkeleton = isFetching;

  // Guardar información de paginación cuando no está cargando
  useEffect(() => {
    if (audiosResponse && !isFetching) {
      setPreviousPaginationInfo({
        totalPages: audiosResponse.metadata.totalPages,
        totalAudios: audiosResponse.metadata.total,
      });
    }
  }, [audiosResponse, isFetching]);

  // ✅ EFECTOS PARA SINCRONIZAR ESTADOS CON URL PARAMS
  useEffect(() => {
    if (paramsObj.page) {
      setCurrentPage(parseInt(paramsObj.page));
    }
  }, [parseInt(paramsObj.page)]);

  useEffect(() => {
    if (paramsObj.pageSize) {
      setItemsPerPage(parseInt(paramsObj.pageSize));
    }
  }, [parseInt(paramsObj.pageSize)]);

  useEffect(() => {
    if (paramsObj.email !== undefined) {
      setQuery(paramsObj.email);
    }
  }, [paramsObj.email]);

  useEffect(() => {
    if (paramsObj.status !== undefined) {
      setStatus(paramsObj.status);
    }
  }, [paramsObj.status]);

  useEffect(() => {
    if (paramsObj.userLevel !== undefined) {
      setUserLevel(paramsObj.userLevel);
    }
  }, [paramsObj.userLevel]);

  useEffect(() => {
    if (paramsObj.sortField) {
      setSortField(paramsObj.sortField as keyof UnifiedAudioRequest);
    }
  }, [paramsObj.sortField]);

  useEffect(() => {
    if (paramsObj.sortDirection) {
      setSortDirection(paramsObj.sortDirection as "asc" | "desc");
    }
  }, [paramsObj.sortDirection]);

  // ✅ ACTUALIZAR URL CUANDO CAMBIEN LOS ESTADOS
  useEffect(() => {
    updateSearchParams({ page: currentPage });
  }, [currentPage]);

  useEffect(() => {
    updateSearchParams({ pageSize: itemsPerPage });
  }, [itemsPerPage]);

  useEffect(() => {
    updateSearchParams({ email: query }); // ✅ USAR "email" como key
  }, [query]);

  useEffect(() => {
    updateSearchParams({ status });
  }, [status]);

  useEffect(() => {
    updateSearchParams({ userLevel });
  }, [userLevel]);

  useEffect(() => {
    updateSearchParams({ sortField: sortField.toString(), sortDirection });
  }, [sortField, sortDirection]);

  // ✅ ELIMINADO: Ya no limpiamos localStorage para mantener persistencia

  // Manejar errores de estadísticas
  useEffect(() => {
    if (statsError) {
      console.error("Error al obtener estadísticas de audios:", statsError);
    }
  }, [statsError]);

  const handleSearch = async (searchQuery: string): Promise<UnifiedAudioRequest[]> => {
    setQuery(searchQuery);
    return audioRequests;
  };

  const handleSortChange = (field: keyof UnifiedAudioRequest, direction: "asc" | "desc") => {
    setSortField(field);
    setSortDirection(direction);
    setCurrentPage(1);
  };

  const handleRowClick = (row: UnifiedAudioRequest) => {
    router.push(`/audio/${row._id}`);
  };

  const handleNewTab = (row: UnifiedAudioRequest) => {
    window.open(
      window.location.href.split("/")[0] + `/audio/${row.id || row._id}`,
      "_blank"
    );
  };

  const handleStatsCardClick = (statusParam: string) => {
    // Resetear estados de presión
    setIsSendedPressed(false);
    setIsErrorPressed(false);
    setIsReviewPressed(false);
    setIsPendingPressed(false);
    setIsCompletedPressed(false);

    // Activar efecto de presión según el status
    const statusLower = statusParam.toLowerCase();
    switch (statusLower) {
      case "sended": setIsSendedPressed(true); break;
      case "error": setIsErrorPressed(true); break;
      case "review": setIsReviewPressed(true); break;
      case "pending": setIsPendingPressed(true); break;
      case "completed": setIsCompletedPressed(true); break;
    }

    // Determinar dirección de orden según el estado
    if (statusParam.length > 0) {
      if (statusLower === "pending" || statusLower === "error" || statusLower === "review") {
        setSortField("requestDate");
        setSortDirection("asc");
      } else {
        setSortField("requestDate");
        setSortDirection("desc");
      }
    } else {
      setSortField("requestDate");
      setSortDirection("desc");
    }
    
    setQuery("");
    setStatus(statusLower);
    setCurrentPage(1);
  };

  // Agregar useEffect para resetear los estados de presión cuando termine el loading
  useEffect(() => {
    if (!isFetching) {
      setIsSendedPressed(false);
      setIsErrorPressed(false);
      setIsReviewPressed(false);
      setIsPendingPressed(false);
      setIsCompletedPressed(false);
    }
  }, [isFetching]);

  const columns: Column<UnifiedAudioRequest>[] = [
    {
      field: "email",
      header: "NOMBRE",
      headerMobile: "USER",
      render: (value, row) => (
        <div
          className="flex items-center gap-3 cursor-pointer hover:bg-accent p-2 rounded-md transition-colors"
          onClick={() => handleRowClick(row)}
        >
          {row.imageUrl && (
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-md overflow-hidden">
              <img
                src={row.imageUrl || "/play.svg"}
                alt="Audio thumbnail"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <div className="font-bold text-foreground text-xs sm:text-[17px] text-left mb-1">
              {row.email || "-"}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground text-left">
              ID: {row._id as string}
            </div>
          </div>
        </div>
      ),
    },
    {
      field: "status",
      header: "STATUS",
      headerMobile: "ST",
      render: (value) => <StatusBadge status={value as string} />,
    },
  
    {
      field: "userLevel",
      header: "NIVEL USUARIO",
      headerMobile: "UL",
      render: (value, row) => {
        if (row.userLevel && typeof row.userLevel === "string") {
          return (
            <div className="font-medium text-foreground text-xs sm:text-sm">
              Nivel {row.userLevel}
            </div>
          );
        }
        return (
          <div className="font-medium text-muted-foreground text-xs sm:text-sm">
            Sin nivel
          </div>
        );
      },
    },
    {
      field: "userData",
      header: "IDIOMA",
      headerMobile: "ID",
      render: (value, row) => {
        const language = row.userData?.language;
        if (language === "es") {
          return (
            <div className="font-medium text-foreground text-xs sm:text-sm">
              Español
            </div>
          );
        } else if (language === "en") {
          return (
            <div className="font-medium text-foreground text-xs sm:text-sm">
              Inglés
            </div>
          );
        }
        return (
          <div className="font-medium text-muted-foreground text-xs sm:text-sm">
            Sin idioma
          </div>
        );
      },
    },
    {
      field: "requestDate",
      header: "FECHA DE PEDIDO",
      headerMobile: "PEDIDO",
      render: (value) => {
        const date = new Date(value as string);
        return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleString("es-ES");
      },
    },
    {
      field: "publicationDate",
      header: "FECHA DE ENTREGA",
      headerMobile: "ENTREGA",
      render: (value) => {
        const date = new Date(value as string);
        return new Date(date.getTime() + date.getTimezoneOffset() * 60000).toLocaleString("es-ES");
      },
    },
    {
      field: "audioUrlPlay",
      header: "AUDIO",
      headerMobile: "♪",
      render: (value, row) => {
        if (row.audioUrlPlay) {
          return (
            <div className="h-[30px] sm:h-[40px] w-[200px] sm:w-[300px] rounded-[30px] bg-muted flex items-center mx-auto">
              <AudioPlayer
                src={value as string}
                showJumpControls={false}
                showFilledVolume={false}
                autoPlayAfterSrcChange={false}
                autoPlay={false}
                layout="horizontal-reverse"
                customControlsSection={[
                  RHAP_UI.MAIN_CONTROLS,
                  RHAP_UI.PROGRESS_BAR,
                ]}
                customProgressBarSection={[
                  RHAP_UI.CURRENT_TIME,
                  <div key="separator" className="mx-1">
                    /
                  </div>,
                  RHAP_UI.DURATION,
                  RHAP_UI.VOLUME_CONTROLS,
                ]}
                customIcons={{
                  play: (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  ),
                  pause: (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                    </svg>
                  ),
                  volume: (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                  ),
                  volumeMute: (
                    <svg
                      className="w-6 h-6"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M7 9v6h4l5 5V4l-5 5H7z" />
                    </svg>
                  ),
                }}
                style={{
                  background: "transparent",
                  boxShadow: "none",
                }}
                className="audio-player-custom"
              />
            </div>
          );
        } else {
          return (
            <div className="">
              <div className="text-muted-foreground text-xs sm:text-sm">
                Sin audio
              </div>
            </div>
          );
        }
      },
    },
    {
      field: "audioUrl",
      header: "URL",
      headerMobile: "URL",
      render: (value) => (
        <button
          onClick={() => navigator.clipboard.writeText(value as string)}
          className="text-blue-500 hover:underline font-medium text-xs sm:text-sm"
        >
          Copiar URL
        </button>
      ),
    },
  ];

  return (
    <div className="min-h-screen">
      {/* Estilos del reproductor de audio */}
      <style jsx global>{`
        .audio-player-custom .rhap_container {
          background: transparent;
          box-shadow: none;
          padding: 0;
          min-width: auto;
          width: 100%;
        }
        .audio-player-custom .rhap_main-controls-button {
          color: hsl(var(--foreground));
          transition: color 0.2s;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .audio-player-custom .rhap_main-controls-button:hover {
          color: #1a56db;
        }
        .audio-player-custom .rhap_progress-filled {
          background-color: #1a56db;
        }
        .audio-player-custom .rhap_progress-indicator {
          display: none;
        }
        .audio-player-custom .rhap_volume-button {
          color: hsl(var(--foreground));
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .audio-player-custom .rhap_volume-indicator {
          display: none;
        }
        .audio-player-custom .rhap_progress-bar {
          background: hsl(var(--border));
          height: 4px;
          border-radius: 2px;
        }
        .audio-player-custom .rhap_progress-bar-show-download {
          background-color: transparent;
        }
        .audio-player-custom .rhap_time {
          color: hsl(var(--foreground));
          font-size: 0.75rem;
        }
        .audio-player-custom .rhap_volume-controls {
          justify-content: flex-end;
          margin-left: 10px;
        }
        .audio-player-custom .rhap_volume-bar {
          display: none;
        }
        .audio-player-custom .rhap_main {
          flex: 0;
        }
        .audio-player-custom .rhap_progress-section {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .audio-player-custom .rhap_total-time {
          margin-left: 0;
        }
        .audio-player-custom .rhap_current-time {
          margin-right: 0;
        }
        .audio-player-custom .rhap_controls-section {
          margin: 0;
        }
        .audio-player-custom .rhap_additional-controls {
          display: none;
        }
        .audio-player-custom .rhap_play-pause-button {
          font-size: 24px;
        }
        .audio-player-custom .rhap_progress-container {
          flex: 1;
        }
        .audio-player-custom .rhap_main-controls {
          margin-right: 8px;
        }
      `}</style>
      <div className="space-y-6">
        <div>
          <h1 className={`${textStyles.h1} negative-letter-spacing`}>Audios</h1>
        </div>

        {/* Grid de estadísticas actualizado */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-8">
          <StatsCard
            label="Enviados"
            value={statsLoading ? "..." : (stats?.byStatus.sended || 0)}
            status="SENDED"
            onClick={handleStatsCardClick}
            isSelected={status.toLowerCase() === "sended"}
            isDataFiltered={status !== ""}
            isPressed={isSendedPressed}
            isLoading={isFetching}
          />
          <StatsCard
            label="Error"
            value={statsLoading ? "..." : (stats?.byStatus.error || 0)}
            color="text-red-500"
            status="ERROR"
            onClick={handleStatsCardClick}
            isSelected={status.toLowerCase() === "error"}
            isDataFiltered={status !== ""}
            isPressed={isErrorPressed}
            isLoading={isFetching}
          />
          <StatsCard
            label="Review"
            value={statsLoading ? "..." : (stats?.byStatus.review || 0)}
            color="text-yellow-500"
            status="REVIEW"
            onClick={handleStatsCardClick}
            isSelected={status.toLowerCase() === "review"}
            isDataFiltered={status !== ""}
            isPressed={isReviewPressed}
            isLoading={isFetching}
          />
          <StatsCard
            label="Pending"
            value={statsLoading ? "..." : (stats?.byStatus.pending || 0)}
            color="text-purple-500"
            status="PENDING"
            onClick={handleStatsCardClick}
            isSelected={status.toLowerCase() === "pending"}
            isDataFiltered={status !== ""}
            isPressed={isPendingPressed}
            isLoading={isFetching}
          />
          <StatsCard
            label="Completed"
            value={statsLoading ? "..." : (stats?.byStatus.completed || 0)}
            color="text-gray-400"
            status="COMPLETED"
            onClick={handleStatsCardClick}
            isSelected={status.toLowerCase() === "completed"}
            isDataFiltered={status !== ""}
            isPressed={isCompletedPressed}
            isLoading={isFetching}
          />
        </div>

        {/* GridDataView */}
        <div className="bg-card rounded-[20px] p-3 sm:p-6">
          <GridDataView<UnifiedAudioRequest>
            data={audioRequests}
            columns={columns}
            isLoading={showSkeleton}
            limit={itemsPerPage}  // Agregar esta línea
            defaultSortField={sortField}
            defaultSortDirection={sortDirection}
            searchFunction={handleSearch}
            initialSearchValue={query}
            onRowClick={handleRowClick}
            onSortChange={handleSortChange}
            onNewTab={handleNewTab}
            additionalFilters={
              <div className="flex items-center gap-2 p-2">
                <div className="relative">
                  <select
                    id="userLevel"
                    value={userLevel}
                    onChange={(e) => setUserLevel(e.target.value)}
                    className="appearance-none bg-background border border-border border-l-0 rounded-md pl-5 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground min-w-[125px] shadow-md shadow-black/20"
                  > 
                  <option value="">Filtro por nivel</option>
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
                      <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                    </svg>
                  </div>
                </div>
              </div>
            }
          />

          {/* Paginación */}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label
              htmlFor="pageSize"
              className="text-xs sm:text-sm text-muted-foreground"
            >
              Mostrar:
            </label>
            <div className="relative">
              <select
                id="pageSize"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="appearance-none bg-background border border-border rounded-md pl-3 pr-8 py-1.5 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-foreground"
              >
                <option value="5">5 registros</option>
                <option value="10">10 registros</option>
                <option value="25">25 registros</option>
                <option value="50">50 registros</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-muted-foreground">
                <svg
                  className="fill-current h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-center sm:flex-grow">
          {totalPages > 1 && (
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrentPage((prev) => prev - 1)}
                disabled={currentPage === 1}
                className="px-2 sm:px-3 py-1 disabled:opacity-20 text-foreground hover:bg-accent rounded transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 sm:px-3 py-1 text-xs sm:text-sm text-foreground">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => prev + 1)}
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
  );
}

// ✅ COMPONENTE PRINCIPAL QUE ENVUELVE CON SUSPENSE
export default function AudiosPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen">
        <div className="space-y-6 animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4 mb-8">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    }>
      <AudiosContent />
    </Suspense>
  );
}
