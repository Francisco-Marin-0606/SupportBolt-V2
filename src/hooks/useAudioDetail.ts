import {
    acceleratePublication,
    getAudioRequestById,
    getAudioRequestsByUserId,
    reprocessAudioRequestV2
} from "@/app/_services/audioRequestService";
import { getAudiosByRequestId } from "@/app/_services/audioService";
import { findOne } from "@/app/_services/mmgUserService";
import { getImageUrlFromSettings } from "@/app/services/audioDetailService";
import { AudioItem, UnifiedAudioRequest } from "@/app/types/audio";
import { AlertState, EditingAudioData, RetryData } from "@/app/types/audioDetail";
import { AudioRequest } from "@/app/types/audioRequest";
import { User } from "@/app/types/user";
import { clearScriptSessionData } from "@/app/utils/audioDetailUtils";
import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

export const useAudioDetail = (audioId: string) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Estados principales
  const [audioData, setAudioData] = useState<AudioRequest | null>(null);
  const [audio, setAudio] = useState<AudioItem | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Estados de funcionalidad
  const [isAccelerating, setIsAccelerating] = useState(false);
  const [isUpdatingTranscription, setIsUpdatingTranscription] = useState<number | null>(null);
  const [editingSections, setEditingSections] = useState<Set<number>>(new Set());
  
  // Estados de historial
  const [historyAudios, setHistoryAudios] = useState<UnifiedAudioRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Estados de modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingAudioData, setEditingAudioData] = useState<EditingAudioData | null>(null);
  
  // Estados de reprocesamiento
  const [showGlobalReprocessModal, setShowGlobalReprocessModal] = useState(false);
  const [reprocessLoading, setReprocessLoading] = useState(false);
  const [retryData, setRetryData] = useState<RetryData | null>(null);
  
  // Estados de errores y alertas
  const [alertState, setAlertState] = useState<AlertState | null>(null);
  const [audiosCorrregidosManualmente, setAudiosCorrregidosManualmente] = useState<Set<number>>(new Set());
  
  // Estados auxiliares
  const [times, setTimes] = useState<{timeStart: number, timeEnd: number}[]>([]);
  
  // Usar useRef para mantener una referencia actualizada del retryData
  const retryDataRef = useRef<RetryData | null>(null);
  
  useEffect(() => {
    retryDataRef.current = retryData;
  }, [retryData]);

  // Funciones helper
  const invalidateAudiosQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['audios'] });
    queryClient.invalidateQueries({ queryKey: ['audioStats'] });
  }, [queryClient]);

  const showAlert = useCallback((type: "success" | "error", message: string) => {
    setAlertState({ show: true, type, message });
    setTimeout(() => setAlertState(null), 5000);
  }, []);

  const clearAllScriptSessionData = useCallback(() => {
    clearScriptSessionData(audioId);
  }, [audioId]);

  const handleBackNavigation = useCallback(() => {
    clearAllScriptSessionData();
    router.back();
  }, [clearAllScriptSessionData, router]);

  // Función principal para cargar datos
  const fetchUserData = useCallback(async (isBackgroundUpdate = false) => {
    try {
      if (!isBackgroundUpdate) {
        setLoading(true);
      }
      
      const audioRequestData = await getAudioRequestById(audioId);
      if (audioRequestData) {
        setAudioData(audioRequestData);
        
        const audioItems = await getAudiosByRequestId(audioId);
        if (audioItems && audioItems.length > 0) {
          setAudio(audioItems[0]);
        }
        
        if (audioRequestData.userId) {
          try {
            const userData = await findOne(audioRequestData.userId);
            if (userData) {
              setUser(userData as unknown as User);
            }
          } catch (userError) {
            console.warn("Usuario no encontrado:", audioRequestData.userId);
            setUser(null);
          }
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error);
    } finally {
      if (!isBackgroundUpdate) {
        setLoading(false);
      }
    }
  }, [audioId]);

  // Función para cargar historial
  const fetchHistory = useCallback(async () => {
    if (!user?._id) return;

    try {
      setLoadingHistory(true);
      const audios = await getAudioRequestsByUserId(user._id as string);
      const filteredAudios = audios.filter(
        (audio) => audio._id !== audioId
      ) as unknown as AudioRequest[];
      
      filteredAudios.sort(
        (a, b) =>
          new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime()
      );
      
      const combinedData = await Promise.all(
        filteredAudios.map(async (request: AudioRequest) => {
          try {
            const audioData = await getAudiosByRequestId(request._id as string);
            const first = audioData?.[0] || {};
            const imageUrl = getImageUrlFromSettings(request) || first.imageUrl || "";
            return {
              ...request,
              id: request._id,
              audioUrl: first.audioUrl || "",
              audioUrlPlay: first.audioUrl || "",
              imageUrl: imageUrl,
              title: first.title || "",
              formattedDuration: first.formattedDuration,
              customData: first.customData || {},
            } as UnifiedAudioRequest;
          } catch (error) {
            console.error("Error obteniendo datos de audio:", error);
            return null;
          }
        })
      );

      setHistoryAudios(combinedData.filter(Boolean) as UnifiedAudioRequest[]);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  }, [user?._id, audioId]);

  // Función de aceleración
  const handleAccelerate = useCallback(async () => {
    try {
      setIsAccelerating(true);
      await acceleratePublication(audioId);
      
      const audioRequestData = await getAudioRequestById(audioId);
      if (audioRequestData) {
        setAudioData(audioRequestData);
      }
      
      invalidateAudiosQueries();
      showAlert("success", "Publicación acelerada con éxito");
      
    } catch (error) {
      console.error("Error al acelerar la publicación:", error);
      showAlert("error", "Error al acelerar la publicación");
    } finally {
      setIsAccelerating(false);
    }
  }, [audioId, invalidateAudiosQueries, showAlert]);

  // Función para re-fetch manual de datos (opcional)
  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      await fetchUserData(true);
      showAlert("success", "Datos actualizados");
    } catch (error) {
      console.error("Error al actualizar datos:", error);
      showAlert("error", "Error al actualizar los datos");
    } finally {
      setLoading(false);
    }
  }, [fetchUserData, showAlert]);

  // Función de reprocesamiento global
  const confirmGlobalReprocess = useCallback(async (activeTab: string) => {
    // Usar la referencia para obtener el valor más actual
    const currentRetryData = retryDataRef.current;
    
    // Si retryData es null o tiene sections vacío, usar el valor por defecto
    const defaultRetryData = {
      sections: [],
      additionalProp1: {}
    };
    
    const retryToSend = currentRetryData && currentRetryData.sections.length > 0 
      ? currentRetryData 
      : defaultRetryData;
    
    const requestPayload = {
      task: audioData?._id as string,
      retry: retryToSend,
      fromScript: activeTab === 'script'
    };
    
    setReprocessLoading(true);
    
    try {
      await reprocessAudioRequestV2(requestPayload);
      
      setReprocessLoading(false);
      setShowGlobalReprocessModal(false);
      showAlert("success", "Audio re-procesado exitosamente");
      
      // Invalidar queries de React Query
      invalidateAudiosQueries();
      
      // Re-fetch de todos los datos del audio para actualizarlos
      // Mantener retryData y audiosCorrregidosManualmente para que las ediciones prevalezcan
      await fetchUserData(true);
      
      // NO limpiar retryData - mantener las ediciones manuales en la UI
      // setRetryData(null);
      
    } catch (error) {
      console.error("Error al re-procesar:", error);
      setReprocessLoading(false);
      showAlert("error", `Error al re-procesar el audio: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }, [retryData, audioData?._id, invalidateAudiosQueries, showAlert, fetchUserData]);

  // Efectos
  useEffect(() => {
    if (audioData?.settings?.exportSettings?.sectionsSettings) {
      setTimes(audioData.settings.exportSettings.sectionsSettings.map(section => ({
        timeStart: section.startTime,
        timeEnd: section.endTime
      })));
    }
  }, [audioData?.settings?.exportSettings?.sectionsSettings]);

  useEffect(() => {
    fetchUserData();
    return () => {
      clearAllScriptSessionData();
    };
  }, [fetchUserData, clearAllScriptSessionData]);

  return {
    // Estados
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
    
    // Setters
    setEditingSections,
    setIsEditModalOpen,
    setEditingAudioData,
    setShowGlobalReprocessModal,
    setRetryData,
    setIsUpdatingTranscription,
    setAudiosCorrregidosManualmente,
    setAudioData,
    
    // Funciones
    handleBackNavigation,
    fetchUserData,
    fetchHistory,
    handleAccelerate,
    confirmGlobalReprocess,
    refreshData,
    showAlert,
    invalidateAudiosQueries,
    clearAllScriptSessionData,
  };
};
