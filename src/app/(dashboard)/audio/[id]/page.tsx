"use client";

import Alert from "@/components/alert/Alert";
import { ConfirmModal, Modal } from "@/components/modal/Modal";
import CopyText from "@/components/ui/CopyText";
import StatusBadge from "@/components/ui/StatusBadge";
import EmptyState from "@/components/ui/table/EmptyState";
import GridDataView, { Column } from "@/components/ui/table/GridDataView";
import { useParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import AudioPlayer, { RHAP_UI } from "react-h5-audio-player";
import "react-h5-audio-player/lib/styles.css";

// Importaciones refactorizadas
import { setVariousAudiosCompleted } from "@/app/_services/audioRequestService";
import { AudioZipData, cleanupAudioUrls, downloadAndUnzipAudios } from "@/app/_services/audioZipService";
import { connection } from "@/app/_services/connectionService";
import {
  prepareGridData
} from "@/app/services/audioDetailService";
import { TABS, TabId } from "@/app/types/audioDetail";
import { formatDateUTC, formatTime } from "@/app/utils/audioDetailUtils";
import { AudioHeader } from "@/components/ui/AudioHeader";
import { AudioRequestUserInfo } from "@/components/ui/AudioRequestUserInfo";
import { QuestionsAnswers } from "@/components/ui/QuestionsAnswers";
import { ScriptSection } from "@/components/ui/ScriptSection";
import { Tab } from "@/components/ui/Tab";
import { useAudioDetail } from "@/hooks/useAudioDetail";
import { useRetryLogic } from "@/hooks/useRetryLogic";

export default function AudioDetailPage() {
  const params = useParams();
  const audioId = params.id as string;
  const [activeTab, setActiveTab] = useState<TabId>("errors");
  
  // Estados para manejo de audios del ZIP
  const [zipAudios, setZipAudios] = useState<AudioZipData | null>(null);
  const [isLoadingZip, setIsLoadingZip] = useState(false);
  const [zipError, setZipError] = useState<string | null>(null);
  const [zipRetryCount, setZipRetryCount] = useState(0);
  const [zipRetryTimer, setZipRetryTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const maxZipRetries = 3;
  const hasAutoTriedZipRef = useRef(false);
  const isZipDownloadingRef = useRef(false);
  
  // Estados para sugerencias (mantenido para UI/CSS)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [showSuggestionGlow, setShowSuggestionGlow] = useState(false);
  
  // Estado para el botón tick
  const [isTickingAudio, setIsTickingAudio] = useState<number | null>(null);
  
  // Estado para audios marcados como correctos
  const [audiosMarcadosComoCorrectos, setAudiosMarcadosComoCorrectos] = useState<Set<number>>(new Set());

  // Hook principal para manejo de estado
  const {
    audioData,
    audio,
    user,
    loading,
    isAccelerating,
    isUpdatingTranscription,
    editingSections,
    historyAudios,
    loadingHistory,
    isEditModalOpen,
    editingAudioData,
    showGlobalReprocessModal,
    reprocessLoading,
    retryData,
    alertState,
    audiosCorrregidosManualmente,
    times,
    setEditingSections,
    setIsEditModalOpen,
    setEditingAudioData,
    setShowGlobalReprocessModal,
    setRetryData,
    setIsUpdatingTranscription,
    setAudiosCorrregidosManualmente,
    setAudioData,
    handleBackNavigation,
    fetchHistory,
    handleAccelerate,
    confirmGlobalReprocess,
    showAlert,
    invalidateAudiosQueries,
  } = useAudioDetail(audioId);

  const {
    updateRetryStructure,
    removeFromRetry,
    toggleTextRegen,
    toggleRemakeAll,
    getTextRetryState,
  } = useRetryLogic(retryData, setRetryData);

  const getTextoCorregidoDesdeRetry = (audioN: number): string | null => {
    if (!audioData?.audioMotive?.generatedSections || !retryData?.sections) return null;
    
    let audioInicio = 1;
    
    for (let i = 0; i < audioData.audioMotive.generatedSections.length; i++) {
      const generatedSection = audioData.audioMotive.generatedSections[i];
      
      if (generatedSection.texts && Array.isArray(generatedSection.texts)) {
        const audioFin = audioInicio + generatedSection.texts.length - 1;
        
        if (audioN >= audioInicio && audioN <= audioFin) {
          const textoIndex = audioN - audioInicio;
          
          // Buscar en retryData
          const sectionRetry = retryData.sections.find((s: any) => s.sectionId === i);
          if (sectionRetry) {
            const textRetry = sectionRetry.texts.find((t: any) => t.index === textoIndex);
            if (textRetry && textRetry.textToUse) {
              return textRetry.textToUse;
            }
          }
          
          return null;
        }
        
        audioInicio = audioFin + 1;
      }
    }
    
    return null;
  };

  const [audiosToMark, setAudiosToMark] = useState<{id: string, audios: { section: number, audio: number }[] }[]>([]);
  const [markingAudiosLoading, setMarkingAudiosLoading] = useState(false);


  // Función global para re-procesar
  const handleGlobalReprocess = () => {
    setShowGlobalReprocessModal(true);
  };

  const handleConfirmReprocess = async () => {
    setMarkingAudiosLoading(true);
    try {
      if (audiosToMark.length > 0) {
        const allAudiosToMark: { section: number, audio: number }[] = [];
        audiosToMark.forEach(item => {
          if (item.id === audioId) {
            allAudiosToMark.push(...item.audios);
          }
        });

        // Solo enviar si hay audios para este audioId
        if (allAudiosToMark.length > 0) {
          await setVariousAudiosCompleted(audioId, allAudiosToMark);
          setAudiosToMark([]);
        }
      }

      await confirmGlobalReprocess(activeTab);
    } catch (error) {
      console.error("Error al marcar audios o re-procesar:", error);
      showAlert("error", `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setMarkingAudiosLoading(false);
    }
  };

  const handleDownloadAudios = async () => {
    if (isZipDownloadingRef.current) return;
    if (!audioData?.userId || !audioId) {
      showAlert("error", "No se pudo obtener la información necesaria");
      return;
    }

    isZipDownloadingRef.current = true;
    setIsLoadingZip(true);
    setZipError(null);

    try {
      const audios = await downloadAndUnzipAudios(audioData.userId, audioId);
      setZipAudios(audios);
      setZipRetryCount(0);
      if (zipRetryTimer) {
        clearTimeout(zipRetryTimer);
        setZipRetryTimer(null);
      }
    } catch (error) {
      console.error("Error al descargar audios:", error);
      setZipError("Error al descargar los audios. Por favor, intente nuevamente.");
      showAlert("error", "Error al descargar los audios");
      // Evitar reintentos automáticos para no entrar en loop; reintento será manual
    } finally {
      setIsLoadingZip(false);
      isZipDownloadingRef.current = false;
    }
  };

  // Función para marcar audio como correcto (botón tick)
  const handleMarkAudioAsCorrect = async (sectionIdx: number, audioIdx: number) => {
      setAudiosToMark(prev => {
        // Buscar si ya existe una entrada para este audioId
        const existingIndex = prev.findIndex(item => item.id === audioId);
        
        if (existingIndex !== -1) {
          // Si existe, verificar si el audio ya está en la lista
          const existingItem = prev[existingIndex];
          const audioExists = existingItem.audios.some(audio => audio.section === sectionIdx && audio.audio === audioIdx);
          
          if (!audioExists) {
            // Agregar el audio a la lista existente
            const updated = [...prev];
            updated[existingIndex] = {
              ...existingItem,
              audios: [...existingItem.audios, { section: sectionIdx, audio: audioIdx }]
            };
            return updated;
          }
          return prev; // Ya existe, no hacer nada
        } else {
          // Si no existe, crear una nueva entrada
          return [...prev, { id: audioId, audios: [{ section: sectionIdx, audio: audioIdx }] }];
        }
      });
  };


  useEffect(() => {
    if (audiosToMark.length > 0) {
      audiosToMark.forEach(item => {
        item.audios.forEach(audio => {
          removeFromRetry(audio.section, audio.audio);
        });
      });
    }
  }, [audiosToMark]);

  const isAudioMarkered = (sectionId: number, audioIdx: number) => {
    return audiosToMark.some(item => item.id === audioId && item.audios.some(audio => audio.section === sectionId && audio.audio === audioIdx)); 
  }



  // Función para enviar sugerencias para un audio específico
  const handleSendSuggestions = async (sectionIdx: number, audioIdx: number, audioNumber: string, originalScript: string, transcription: string, blockIndex: number) => {
    setIsLoadingSuggestions(true);
    
    try {
      // Validar que tenemos los datos necesarios
      if (!audioData?.audioMotive?.generatedSections) {
        showAlert("error", "No hay datos de secciones disponibles");
        return;
      }

      // Obtener la sección correspondiente
      const section = audioData.audioMotive.generatedSections[sectionIdx];
      if (!section) {
        showAlert("error", "No se encontró la sección correspondiente");
        return;
      }

      // Obtener las questions y answers de la sección
      const questionsAndAnswer = section.questions || [];
      
      // Preparar el body según el DTO
      const requestBody = {
        messageToSuggestion: transcription,
        questionsAndAnswer: questionsAndAnswer.map((qa: any) => ({
          question: qa.question,
          answer: qa.answer
        }))
      };

      // Hacer la petición POST al endpoint /suggestions
      const response = await connection.post<{ suggestion: string }>('mmg-audio-requests/suggestions', requestBody);

      if (!response.ok || !response.data) {
        throw new Error(response.error?.message || 'Error al obtener la sugerencia');
      }

      const { suggestion } = response.data;

      // Actualizar el texto del input con la sugerencia recibida
      if (editingAudioData) {
        setEditingAudioData({
          ...editingAudioData,
          currentText: suggestion
        });
      }

      // Activar efecto de brillo
      setShowSuggestionGlow(true);
      setTimeout(() => setShowSuggestionGlow(false), 2500);

      showAlert("success", "Sugerencia obtenida y aplicada");
      
    } catch (error) {
      console.error('Error al obtener sugerencia:', error);
      showAlert("error", "Error al obtener la sugerencia");
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const getAudioUrlFromZip = (sectionIdx: number, audioIdx: number): string | null => {
    if (!zipAudios) return null;
    const section = zipAudios[sectionIdx.toString()];
    if (!section) return null;
    return section[audioIdx.toString()] || null;
  };


  // Cargar historial cuando se cambia a la pestaña
  useEffect(() => {
    if (activeTab === "history" && user?._id) {
      fetchHistory();
    }
  }, [activeTab, user?._id, fetchHistory]);

  // Inicializar guardia de auto-intento (persistente por audioId) usando sessionStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `zipAutoTried:${audioId}`;
    const val = window.sessionStorage.getItem(key);
    hasAutoTriedZipRef.current = val === 'true';
  }, [audioId]);

  // Descarga automática inicial cuando el audio está en estado "review"
  // Solo dispara una vez por audioId y si no hubo error
  useEffect(() => {
    if (
      audioData?.status === "review" &&
      !zipAudios &&
      !isLoadingZip
      && !zipError
    ) {
      hasAutoTriedZipRef.current = true;
      if (typeof window !== 'undefined') {
        const key = `zipAutoTried:${audioId}`;
        window.sessionStorage.setItem(key, 'true');
      }
      handleDownloadAudios();
    }
  }, [audioData?.status, zipAudios, isLoadingZip, zipError, audioId]);


  // Limpiar URLs de Blob cuando se desmonte el componente
  useEffect(() => {
    return () => {
      if (zipAudios) {
        cleanupAudioUrls(zipAudios);
      }
    };
  }, [zipAudios]);

  const columns: Column<any>[] = [
    {
      field: "status",
      header: "STATUS",
      render: (value) => <StatusBadge status={value as string} />,
    },
    {
      field: "userLevel ",
      header: "NIVEL",
      render: (value, row) => {
        if (row.userLevel && typeof row.userLevel === "string") {
          return <div className="text-[16px]">Nivel {row.userLevel}</div>;
        }
        return <div className="font-medium">Sin nivel</div>;
      },
    },
    {
      field: "userData",
      header: "IDIOMA",
      render: (value, row) => {
        // Debug: mostrar la estructura completa
  
        // Intentar obtener el idioma de diferentes formas
        const language = row.userData?.language || (row as any).language || (value as any)?.language;
        
        if (language === "es") {
          return (
            <div className="font-medium text-[16px]">
              Español
            </div>
          );
        } else if (language === "en") {
          return (
            <div className="font-medium text-[16px]">
              Inglés
            </div>
          );
        }
        return (
          <div className="font-medium text-[16px] text-gray-500">
            Sin idioma ({language || "undefined"})
          </div>
        );
      },
    },
    {
      field: "requestDate",
      header: "FECHA DE PEDIDO",
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="text-base font-medium flex items-center gap-[5px]"
          iconClassName="hidden"
          color="text-black"
        />
      ),
    },
    {
      field: "publicationDate",
      header: "FECHA DE ENTREGA",
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="text-base font-medium flex items-center gap-[5px]"
          iconClassName="hidden"
          color="text-black"
        />
      ),
    },
    {
      field: "audioUrlPlay",
      header: "AUDIO",
      render: (value, row) => {
        if (value && typeof value === "string" && value !== "") {
          return (
            <div
              className="h-[40px] w-[300px] rounded-[30px] bg-gray-100 flex items-center mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
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
            <div className="" onClick={(e) => e.stopPropagation()}>
              <div className="text-gray-500 text-sm">Sin audio</div>
            </div>
          );
        }
      },
    },
    {
      field: "audioUrl",
      header: "URL",
      render: (value) => (
        <button
          className="text-blue-500 hover:text-blue-700 font-medium"
          onClick={(e) => {
            e.stopPropagation();
            if (value && typeof value === "string") {
              navigator.clipboard.writeText(
                (value as string) || "https://mentalmagnet.com"
              );
            }
          }}
        >
          Copiar URL
        </button>
      ),
    },
  ];

  // Preparar los datos para el grid con useMemo para evitar re-renders
  const gridData = useMemo(() => {

    return prepareGridData(audioData, audio);
  }, [audioData, audio]);

  // ==========================================
  // NUEVA LÓGICA SIMPLIFICADA: Solo usar completed === false
  // ==========================================
  
  // Construir estructura de errores basada únicamente en completed === false
  const { bloquesErrores, errorsBySection } = useMemo(() => {
    if (
      !audioData?.audioMotive?.generatedSections ||
      !Array.isArray(audioData.audioMotive.generatedSections)
    ) {
      return { bloquesErrores: [], errorsBySection: new Map() };
    }

    const audiosConError: any[] = [];
    const errorsBySectionMap = new Map<number, number[]>(); // sectionIdx -> [audioIDs con error]
    let audioN = 1; // Contador global de audios

    // Recorrer todas las secciones
    audioData.audioMotive.generatedSections.forEach((section, sectionIdx) => {
      const errorsInThisSection: number[] = [];

      if (section.audios && Array.isArray(section.audios)) {
        section.audios.forEach((audioItem, audioIdx) => {
          // ÚNICO CRITERIO: completed === false
          if (audioItem.completed === false) {
            // Buscar si hay una transcripción editada en retryData
            let transcripcionFinal = audioItem.transcription || audioItem.text || "";
            
            if (retryData?.sections) {
              const sectionRetry = retryData.sections.find((s: any) => s.sectionId === sectionIdx);
              if (sectionRetry) {
                const textRetry = sectionRetry.texts.find((t: any) => t.index === audioIdx);
                // Si hay un texto editado en retry, usarlo como transcripción
                if (textRetry && textRetry.textToUse) {
                  transcripcionFinal = textRetry.textToUse;
                }
              }
            }

            // Agregar a la lista de errores
            audiosConError.push({
              audioN: audioN,
              script: section.texts?.[audioIdx] || audioItem.text || "",
              transcription: transcripcionFinal,
              sectionIdx: sectionIdx,
              audioIdx: audioIdx,
              audioID: audioItem.audioID,
              completed: audioItem.completed
            });

            // Registrar el índice del audio en esta sección (para ScriptSection)
            errorsInThisSection.push(audioIdx);
          }
          audioN++;
        });
      } else if (section.texts) {
        // Si no hay audios[], contar los texts para mantener numeración correcta
        audioN += section.texts.length;
      }

      // Guardar errores de esta sección
      if (errorsInThisSection.length > 0) {
        errorsBySectionMap.set(sectionIdx, errorsInThisSection);
      }
    });

    // Retornar ambas estructuras
    const bloques = audiosConError.length > 0 
      ? [{ audios: audiosConError, bloqueIdx: 0 }] 
      : [];

    return { 
      bloquesErrores: bloques, 
      errorsBySection: errorsBySectionMap 
    };
  }, [audioData?.audioMotive?.generatedSections, retryData]);

  // ==========================================
  // FIN DE NUEVA LÓGICA
  // ==========================================

  // Eliminar las variables antiguas: errorSectionId, failedAudioIds, lastErrorStatus, computeAudioN
  // Ya no son necesarias

  // Columnas para el historial
  const historyColumns: Column<any>[] = [
    {
      field: "audioMotive",
      header: "NOMBRE",
      render: (value, row) => (
        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-md transition-colors">
          <div className="w-8 h-8 rounded-md overflow-hidden">
            {row.imageUrl && (
              <img
                src={row.imageUrl || "/play.svg"}
                alt="Audio thumbnail"
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <div className="font-bold text-[16px] text-left">
              {row.title || "-"}
            </div>
            <CopyText
              text={`${row.id}`}
              className="cursor-pointer flex items-center gap-[5px] text-[12px] font-medium text-left"
              iconClassName="w-[12px] h-[12px]"
              color="text-gray-500"
            />
          </div>
        </div>
      ),
    },
    {
      field: "status",
      header: "STATUS",
      render: (value) => <StatusBadge status={value as string} />,
    },
    {
      field: "settings",
      header: "NIVEL",
      render: (value, row) => {
        if (row.userLevel && typeof row.userLevel === "string") {
          return <div className="font-medium">Nivel{row.userLevel}</div>;
        }
        return <div className="font-medium">Sin nivel</div>;
      },
    },
    {
      field: "requestDate",
      header: "FECHA DE PEDIDO",
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="text-base font-medium flex items-center gap-[5px]"
          iconClassName="w-[15px] h-[15px]"
          color="text-black"
        />
      ),
    },
    {
      field: "publicationDate",
      header: "FECHA DE ENTREGA",
      render: (value) => (
        <CopyText
          text={`${formatDateUTC(value as string)}`}
          className="text-base font-medium flex items-center gap-[5px]"
          iconClassName="w-[15px] h-[15px] text-black"
        />
      ),
    },
    {
      field: "audioUrlPlay",
      header: "AUDIO",
      render: (value) => {
        if (value && typeof value === "string" && value !== "") {
          return (
            <div
              className="h-[40px] w-[300px] rounded-[30px] bg-gray-100 flex items-center mx-auto"
              onClick={(e) => e.stopPropagation()}
            >
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
            <div className="" onClick={(e) => e.stopPropagation()}>
              <div className="text-gray-500 text-sm">Sin audio</div>
            </div>
          );
        }
      },
    },
    {
      field: "audioUrl",
      header: "URL",
      render: (value) => (
        <button
          className="text-blue-500 hover:text-blue-700 font-medium"
          onClick={(e) => {
            e.stopPropagation();
            if (value && typeof value === "string") {
              navigator.clipboard.writeText(
                (value as string) || "https://mentalmagnet.com"
              );
            }
          }}
        >
          Copiar URL
        </button>
      ),
    },
  ];

  const handleHistoryNewTab = (item: any) => {
    window.open(
      window.location.href.split("/").slice(0, -1).join("/") +
        `/${item.id || item._id}`,
      "_blank"
    );
  };

  const handleHistoryRowClick = (row: any) => {
    window.location.href = `/audio/${row.id}`;
  };


  // Función de confirmación de edición de transcripción
  const handleEditTranslation = async () => {
    if (!editingAudioData || !audioData) return;
    
    
    const audioNumMatch = editingAudioData.audioNumber.match(/Audio N°(\d+)/);
    const audioNumber = audioNumMatch ? parseInt(audioNumMatch[1]) : null;
    
    if (!audioNumber) return;

    
    setIsUpdatingTranscription(audioNumber);
    setIsEditModalOpen(false);
    setEditingAudioData(null);
    
    try {
      const newAudioData = JSON.parse(JSON.stringify(audioData));

      if (audioNumber && newAudioData?.audioMotive?.generatedSections) {
        let audioInicio = 1;
        let encontrado = false;
        
        for (let i = 0; i < newAudioData.audioMotive.generatedSections.length && !encontrado; i++) {
          const generatedSection = newAudioData.audioMotive.generatedSections[i];
          
          if (generatedSection.texts && Array.isArray(generatedSection.texts)) {
            const audioFin = audioInicio + generatedSection.texts.length - 1;
            
            if (audioNumber >= audioInicio && audioNumber <= audioFin) {
              const textoIndex = audioNumber - audioInicio;
              const originalText = generatedSection.texts[textoIndex];
              // NO modificar generatedSection.texts - debe mantenerse el guion original
              
              // Obtener el audioID del audio correspondiente
              const audioItem = generatedSection.audios?.[textoIndex];
              const audioID = audioItem?.audioID;
              
              if (!audioID) {
                console.warn(`⚠️ No se encontró audioID para el texto en posición ${textoIndex}`);
              }
              
              // Usar la transcripción original como base para comparar, no el script
              updateRetryStructure(i, textoIndex, editingAudioData.currentText, editingAudioData.transcription, audioID);
              
              setAudiosCorrregidosManualmente(prev => new Set(prev).add(audioNumber));
              
              encontrado = true;
              break;
            }
            
            audioInicio = audioFin + 1;
          }
        }
        
        if (!encontrado) {
          console.error(`❌ No se encontró el Audio N°${audioNumber} en audioMotive.generatedSections`);
        }
      }

      // Sin solicitudes: solo actualiza estado local
      setAudioData(newAudioData);
      showAlert("success", "Transcripción corregida");
      
    } catch (error) {
      console.error("❌ Error al actualizar:", error);
      const message = error instanceof Error ? error.message : String(error);
      showAlert("error", "Error al actualizar la transcripción: " + message);
    } finally {
      setIsUpdatingTranscription(null);
    }
  };

  // Función para resaltar diferencias entre dos textos usando algoritmo de diff
  const highlightDifferences = (original: string, transcription: string) => {
    // Función auxiliar para normalizar palabras (eliminar puntuación y convertir a minúsculas)
    const normalizeWord = (word: string) => {
      return word.toLowerCase().replace(/[.,;:!?¿¡"""'`()[\]{}…-]/g, '');
    };
    
    // Separar en palabras (sin espacios)
    const originalWords = original.split(/\s+/).filter(w => w.length > 0);
    const transcriptionWords = transcription.split(/\s+/).filter(w => w.length > 0);
    
    // Algoritmo de diff simple (LCS - Longest Common Subsequence)
    const lcsMatrix: number[][] = [];
    for (let i = 0; i <= originalWords.length; i++) {
      lcsMatrix[i] = [];
      for (let j = 0; j <= transcriptionWords.length; j++) {
        if (i === 0 || j === 0) {
          lcsMatrix[i][j] = 0;
        } else if (normalizeWord(originalWords[i - 1]) === normalizeWord(transcriptionWords[j - 1])) {
          lcsMatrix[i][j] = lcsMatrix[i - 1][j - 1] + 1;
        } else {
          lcsMatrix[i][j] = Math.max(lcsMatrix[i - 1][j], lcsMatrix[i][j - 1]);
        }
      }
    }
    
    // Reconstruir las diferencias
    const originalDiffs: Array<{ word: string; isDiff: boolean }> = [];
    const transcriptionDiffs: Array<{ word: string; isDiff: boolean }> = [];
    
    let i = originalWords.length;
    let j = transcriptionWords.length;
    
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && normalizeWord(originalWords[i - 1]) === normalizeWord(transcriptionWords[j - 1])) {
        originalDiffs.unshift({ word: originalWords[i - 1], isDiff: false });
        transcriptionDiffs.unshift({ word: transcriptionWords[j - 1], isDiff: false });
        i--;
        j--;
      } else if (j > 0 && (i === 0 || lcsMatrix[i][j - 1] >= lcsMatrix[i - 1][j])) {
        transcriptionDiffs.unshift({ word: transcriptionWords[j - 1], isDiff: true });
        j--;
      } else if (i > 0) {
        originalDiffs.unshift({ word: originalWords[i - 1], isDiff: true });
        i--;
      }
    }
    
    // Renderizar con resaltado agrupado
    const renderWithHighlight = (diffs: Array<{ word: string; isDiff: boolean }>, color: string, bgColor: string) => {
      const result: React.JSX.Element[] = [];
      let currentGroup: string[] = [];
      let groupStartIdx = 0;
      
      diffs.forEach((item, idx) => {
        if (item.isDiff) {
          if (currentGroup.length === 0) {
            groupStartIdx = idx;
          }
          currentGroup.push(item.word);
        } else {
          if (currentGroup.length > 0) {
            result.push(
              <span 
                key={`diff-${groupStartIdx}`}
                style={{ 
                  color, 
                  fontWeight: 600,
                  backgroundColor: bgColor,
                  padding: '2px 3px',
                  borderRadius: '4px'
                }}
              >
                {currentGroup.join(' ')}
              </span>
            );
            currentGroup = [];
          }
          result.push(<span key={`normal-${idx}`}> {item.word}</span>);
        }
      });
      
      // Añadir el último grupo si existe
      if (currentGroup.length > 0) {
        result.push(
          <span 
            key={`diff-${groupStartIdx}`}
            style={{ 
              color, 
              fontWeight: 600,
              backgroundColor: bgColor,
              padding: '2px 3px',
              borderRadius: '4px'
            }}
          >
            {currentGroup.join(' ')}
          </span>
        );
      }
      
      return result;
    };
    
    const originalResult = renderWithHighlight(originalDiffs, '#f9c515', 'rgba(249, 197, 21, 0.3)');
    const transcriptionResult = renderWithHighlight(transcriptionDiffs, '#f76666', 'rgba(247, 102, 102, 0.3)');
    
    return { originalResult, transcriptionResult };
  };

  // Función para abrir el modal de edición
  const handleOpenEditModal = (
    audioNumber: string,
    originalScript: string,
    transcription: string,
    blockIndex: number,
    sectionIdx?: number,
    audioIdx?: number
  ) => {
    setEditingAudioData({
      blockIndex: blockIndex,
      originalScript,
      transcription,
      currentText: originalScript,
      audioNumber,
      sectionIdx,
      audioIdx
    });
    setIsEditModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Cargando...</div>
      </div>
    );
  }

  if (!audioData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-gray-600">Audio no encontrado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Alert */}
      {alertState?.show && (
        <div className="fixed top-4 right-4 z-[9999] w-96">
          <Alert
            variant={alertState.type}
            title={alertState.type === "success" ? "¡Éxito!" : "Error"}
            description={alertState.message}
            onClose={() => {}}
          />
        </div>
      )}

      {/* Contenido original */}
      <div className="px-1 mb-1">
        <button
          onClick={handleBackNavigation}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver
        </button>
      </div>

      <div className="flex gap-4 mt-4">
        {/* Sección Principal (85%) */}
        <div className="items-start flex-col w-[85%]">
          {/* Encabezado con imagen y datos */}
          <AudioHeader 
            audio={audio}
            audioData={audioData}
            isAccelerating={isAccelerating}
            onAccelerate={handleAccelerate}
          />

          <div className="flex-col mt-6 items-center">
            <label className="text-lg font-bold">Información</label>
            <div className="flex gap-4 bg-black h-[2px] w-[100px]" />
          </div>

          {/* Contenido principal usando GridDataView */}
          <div className="space-y-6 mt-6">
            <div className="bg-white rounded-[20px] overflow-hidden p-1">
              <GridDataView
                data={gridData}
                columns={columns}
                showSearch={false}
                isLoading={loading}
              />
            </div>
          </div>
        </div>

        {/* Sección Lateral - Información del Usuario (15%) */}
        <div className="w-[15%] space-y-4">
          <AudioRequestUserInfo audioData={audioData} />
        </div>
      </div>

      <div id="tabs-section" className="border-b border-gray-200 mt-10">
        <div className="flex gap-">
          {TABS.map((tab) => (
            <Tab
              key={tab.id}
              label={tab.label}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as TabId)}
            />
          ))}
        </div>
      </div>

      {/* Botón Re-procesar para pestañas script y errors */}
      {(activeTab === "script" || activeTab === "errors") && (
        <div className="flex justify-end mt-6 mb-6">
          <button
            className="px-6 py-2 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            onClick={handleGlobalReprocess}
          >
            Re-Procesar
          </button>
        </div>
      )}

      {/* Formulario */}
      {activeTab === "questions-answers" && audioData && (
        <QuestionsAnswers audioData={audioData} audio={audio} />
      )}

      {activeTab === "script" && (
        <div className="mt-6 space-y-6">
          {audioData?.audioMotive?.generatedSections &&
          audioData?.audioMotive?.generatedSections.length > 0 &&
          audioData?.settings?.exportSettings?.sectionsSettings &&
          audioData?.settings?.exportSettings?.sectionsSettings.length > 0 ? (
            audioData?.audioMotive?.generatedSections?.map((item, index) => (
              <ScriptSection
                key={`section-${index}`}
                script={item.texts}
                time={`${formatTime(
                  audioData?.settings?.exportSettings?.sectionsSettings[index]
                    .startTime || 0
                )} - ${formatTime(
                  audioData?.settings?.exportSettings?.sectionsSettings[index]
                    .endTime || 0
                )}`}
                index={index}
                correcciones={[]}
                audioData={audioData}
                audioId={audioId}
                audioUrl={audio?.audioUrl}
                retryData={retryData}
                audiosCorrregidosManualmente={audiosCorrregidosManualmente}
                times={times}
                onSave={invalidateAudiosQueries}
                onUpdateRetry={updateRetryStructure}
                onRemoveFromRetry={removeFromRetry}
                onToggleTextRegen={toggleTextRegen}
                onToggleRemakeAll={toggleRemakeAll}
                getTextRetryState={(textIndex: number) => getTextRetryState(index, textIndex)}
                showAlert={showAlert}
                editingSections={editingSections}
                setEditingSections={setEditingSections}
                setAudioData={setAudioData}
                errorSectionId={errorsBySection.has(index) ? index : null}
                failedAudioIds={errorsBySection.get(index) || []}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-[200px] bg-white rounded-[20px] p-8">
              <svg
                className="w-12 h-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <p className="text-gray-500 text-lg font-medium text-center">
                No se ha generado el guión de hipnosis
              </p>
              <p className="text-gray-400 text-sm mt-2 text-center">
                El guión aparecerá aquí una vez que se procese la solicitud
              </p>
            </div>
          )}
        </div>
      )}

      {activeTab === "errors" && (
        <div className="mt-6 p-6 bg-white rounded-[20px]">
          {/* Header con botones */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">
                Errores de Transcripción
              </h2>
              {zipError && (
                <div className="flex items-center gap-2">
                  <p className="text-red-500 text-sm mt-1">{zipError}</p>
                  <button
                    className="text-sm underline"
                    onClick={() => {
                      setZipError(null);
                      handleDownloadAudios();
                    }}
                  >
                    Reintentar descarga
                  </button>
                </div>
              )}
          
            </div>

          </div>

          {/* Renderizar lista de errores */}
          <div className="flex flex-col gap-6">
            {bloquesErrores.length > 0 ? (
              <>
                {bloquesErrores.map(({ audios, bloqueIdx }) => (
                  <div
                    key={bloqueIdx}
                    className={`bg-white p-8 rounded-[20px]${
                      bloqueIdx === bloquesErrores.length - 1 ? "" : " mb-8"
                    }`}
                  >
                    {audios.map((item: any, idx: number) => {
                      const fueCorregidoManualmente = audiosCorrregidosManualmente.has(item.audioN);
                      const fueMarcadoComoCorrecto = audiosMarcadosComoCorrectos.has(item.audioN);
                      const textoCorregido = fueCorregidoManualmente ? getTextoCorregidoDesdeRetry(item.audioN) : null;
                      const estaActualizandose = isUpdatingTranscription === item.audioN;
                      const isMarked = isAudioMarkered(item.sectionIdx, item.audioIdx);

                      return (
                        <div key={idx} className={`border-l-4 pl-4 p-2 mb-4 ${
                          (fueMarcadoComoCorrecto || isMarked)
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200'
                        }`}>
                          {estaActualizandose ? (
                            <div className="animate-pulse">
                              <div className="flex items-center gap-4 mb-2">
                                <div className="h-6 bg-gray-200 rounded w-24"></div>
                                <div className="h-9 bg-gray-200 rounded w-16"></div>
                              </div>
                              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>x
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-4 mb-2">
                                <div className="flex items-center gap-2">
                                  <p className="font-bold text-[20px] m-0">
                                    Audio N°{item.audioN}
                                  </p>
                                  {(fueMarcadoComoCorrecto || isMarked) && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      ✓ Marcado como correcto
                                    </span>
                                  )}
                                </div>
                                <button
                                  className={
                                    (fueMarcadoComoCorrecto || isMarked)
                                      ? "px-6 py-2 border-2 border-gray-300 rounded-lg font-medium text-base bg-gray-100 text-gray-500 cursor-not-allowed"
                                      : fueCorregidoManualmente
                                      ? "px-6 py-2 border-2 border-black rounded-lg font-medium text-base bg-white hover:bg-gray-100 transition-colors"
                                      : "px-6 py-2 border-2 border-black rounded-lg font-medium text-base bg-black text-white hover:bg-gray-900 transition-colors"
                                  }
                                  onClick={() =>
                                    handleOpenEditModal(
                                      `Audio N°${item.audioN}`,
                                      item.script,
                                      textoCorregido || item.transcription,
                                      idx,
                                      item.sectionIdx,
                                      item.audioIdx
                                    )
                                  }
                                  disabled={estaActualizandose || fueMarcadoComoCorrecto || isMarked}
                                  title={(fueMarcadoComoCorrecto || isMarked) ? "Este audio ya fue marcado como correcto" : undefined}
                                >
                                  {(fueMarcadoComoCorrecto || isMarked) ? "Marcado como correcto" : fueCorregidoManualmente ? "Volver a editar" : "Editar"}
                                </button>
                                <button
                                  onClick={() => {
                                    console.log('🖱️ Botón tick clickeado para audio:', item.audioN, 'sectionIdx:', item.sectionIdx, 'audioIdx:', item.audioIdx);
                                    handleMarkAudioAsCorrect(item.sectionIdx, item.audioIdx);
                                  }}
                                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-50 ${
                                    isMarked
                                      ? 'bg-green-500 cursor-not-allowed'
                                      : 'bg-gray-100 hover:bg-gray-200'
                                  }`}
                                  title={isMarked ? "Ya marcado como correcto" : "Marcar como correcto"}
                                  disabled={estaActualizandose || isTickingAudio === item.audioN || isMarked}
                                >
                                  {isTickingAudio === item.audioN ? (
                                    <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${
                                      isMarked ? 'border-white' : 'border-gray-600'
                                    }`}></div>
                                  ) : isMarked ? (
                                    <svg
                                      className="w-4 h-4 text-white"
                                      fill="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  ) : (
                                    <svg
                                      className="w-4 h-4 text-gray-600"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2.5}
                                        d="M5 13l4 4L19 7"
                                      />
                                    </svg>
                                  )}
                                </button>
                              </div>
                              {fueCorregidoManualmente && textoCorregido ? (
                                <>
                                  <p className="m-0">
                                    <span className="font-bold">Guion original:</span>{" "}
                                    {item.script}
                                  </p>
                                  <p className="m-0">
                                    <span className="font-bold">Transcripción:</span>{" "}
                                    <span className="text-green-700 font-medium">
                                      {textoCorregido}
                                    </span>
                                  </p>
                                </>
                              ) : (
                                (() => {
                                  const { originalResult, transcriptionResult } = highlightDifferences(
                                    item.script,
                                    item.transcription
                                  );
                                  return (
                                    <>
                                      <p className="m-0">
                                        <span className="font-bold">Guion original:</span>{" "}
                                        {originalResult}
                                      </p>
                                      <p className="m-0">
                                        <span className="font-bold">Transcripción:</span>{" "}
                                        {transcriptionResult}
                                      </p>
                                    </>
                                  );
                                })()
                              )}
                              
                              {/* Reproductor de audio */}
                              {(() => {
                                // Si está en estado "review" y no hay zipAudios, mostrar skeleton
                                if (audioData?.status === "review" && !zipAudios) {
                                  return (
                                    <div className="mt-4">
                                      <p className="font-bold text-sm mb-2">Audio generado:</p>
                                      <div className="h-[40px] w-full max-w-[500px] rounded-[30px] bg-gray-200 flex items-center animate-pulse">
                                        <div className="flex items-center gap-3 px-4">
                                          <div className="w-8 h-8 bg-gray-300 rounded-full"></div>
                                          <div className="flex-1 h-2 bg-gray-300 rounded"></div>
                                          <div className="w-16 h-2 bg-gray-300 rounded"></div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // Si hay zipAudios, mostrar el reproductor real
                                if (zipAudios) {
                                  const audioUrl = getAudioUrlFromZip(item.sectionIdx, item.audioIdx);
                                  return audioUrl ? (
                                    <div className="mt-4">
                                      <p className="font-bold text-sm mb-2">Audio generado:</p>
                                      <div
                                        className="h-[40px] w-full max-w-[500px] rounded-[30px] bg-gray-100 flex items-center"
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        <AudioPlayer
                                        src={audioUrl}
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
                                  </div>
                                ) : null;
                                }
                                
                                return null;
                              })()}
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </>
            ) : (
              <EmptyState
                title="No hay errores para mostrar"
                description="Todos los audios se completaron correctamente."
              />
            )}
          </div>
        </div>
      )}

      {activeTab === "history" && (
        <div className="mt-6">
          <div className="bg-white rounded-[20px] overflow-hidden">
            {loadingHistory ? (
              <div className="flex justify-center items-center h-32">
                <div className="text-gray-500">Cargando historial...</div>
              </div>
            ) : historyAudios.length > 0 ? (
              <GridDataView
                data={historyAudios}
                columns={historyColumns}
                showSearch={false}
                isLoading={loadingHistory}
                onRowClick={handleHistoryRowClick}
                onNewTab={handleHistoryNewTab}
              />
            ) : (
              <EmptyState
                title="No hay historial de hipnosis"
                description="Este usuario no tiene otras sesiones de hipnosis registradas."
              />
            )}
          </div>
        </div>
      )}

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
          color: #374151;
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
          color: #374151;
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
          background: #e5e7eb;
          height: 4px;
          border-radius: 2px;
        }
        .audio-player-custom .rhap_progress-bar-show-download {
          background-color: transparent;
        }
        .audio-player-custom .rhap_time {
          color: #374151;
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

      {/* Modal de edición */}
      {isEditModalOpen && editingAudioData && (() => {
        const { originalResult, transcriptionResult } = highlightDifferences(
          editingAudioData.originalScript,
          editingAudioData.transcription
        );
        return (
          <Modal onClose={() => setIsEditModalOpen(false)}>
            <div className=" text-white p-8 rounded-lg w-full mx-4">
              <div className="mb-4">
                <p className="text-sm mb-0">
                  <span className="font-bold">Guión original:</span>{" "}
                  {originalResult}
                </p>
                <p className="text-sm mb-2">
                  <span className="font-bold">Transcripción:</span>{" "}
                  {transcriptionResult}
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={editingAudioData.currentText}
                  onChange={(e) =>
                    setEditingAudioData({
                      ...editingAudioData,
                      currentText: e.target.value,
                    })
                  }
                  className={`w-full h-16 p-3 bg-white text-black rounded border resize-none transition-all duration-500 ${
                    showSuggestionGlow 
                      ? 'border-blue-400 shadow-lg shadow-blue-200 bg-blue-50' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Corrige la transcripción aquí..."
                  style={{
                    boxShadow: showSuggestionGlow 
                      ? '0 0 0 2px rgba(59, 130, 246, 0.4), 0 4px 12px rgba(59, 130, 246, 0.2)' 
                      : 'none'
                  }}
                />
                {showSuggestionGlow && (
                  <div className="absolute -top-2 -right-2 bg-blue-600 text-white text-xs px-3 py-1 rounded-md shadow-md">
                    💡 Sugerencia aplicada
                  </div>
                )}
              </div>

              <div className="flex justify-center gap-3 mt-2">
                <button
                  className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={isUpdatingTranscription !== null}
                >
                  Cancelar
                </button>
                <button
                  className="px-6 py-2 bg-white text-black rounded hover:bg-gray-100 disabled:opacity-50 flex items-center gap-2"
                  onClick={handleEditTranslation}
                  disabled={isUpdatingTranscription !== null}
                >
                  {isUpdatingTranscription !== null ? (
                    <>
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : (
                    "Confirmar"
                  )}
                </button>
                <button
                  className={`px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
                    isLoadingSuggestions
                      ? "bg-gray-400 cursor-not-allowed text-white"
                      : "bg-blue-600 text-white hover:bg-blue-700"
                  }`}
                  onClick={() => {
                    if (editingAudioData?.sectionIdx !== undefined && editingAudioData?.audioIdx !== undefined) {
                      handleSendSuggestions(
                        editingAudioData.sectionIdx, 
                        editingAudioData.audioIdx, 
                        editingAudioData.audioNumber,
                        editingAudioData.originalScript,
                        editingAudioData.transcription,
                        editingAudioData.blockIndex
                      );
                    }
                  }}
                  disabled={isLoadingSuggestions || editingAudioData?.sectionIdx === undefined || editingAudioData?.audioIdx === undefined}
                  title="Obtener sugerencia para este audio"
                >
                  {isLoadingSuggestions ? (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* Modal de confirmación para reprocesamiento global */}
      <ConfirmModal
        isOpen={showGlobalReprocessModal}
        onClose={() => setShowGlobalReprocessModal(false)}
        onConfirm={handleConfirmReprocess}
        title="Confirmar Reprocesamiento"
        message="¿Estás seguro de que deseas re-procesar todo el audio? Esta acción no se puede deshacer."
        confirmText="Re-Procesar"
        loading={reprocessLoading || markingAudiosLoading}
      />

    </div>
  );
}
