import { UnifiedAudioRequest } from "@/app/types/audio";
import { AudioRequest } from "@/app/types/audioRequest";

/**
 * Servicio para manejar la lógica de negocio específica de la página de detalle de audio
 */

// Obtener la URL de la imagen según el género del usuario
export const getImageUrlFromSettings = (audioData: AudioRequest | null): string => {
  if (!audioData?.settings?.appSettings?.formSettings?.genderImage) {
    return "";
  }

  const genderImages = audioData.settings.appSettings.formSettings.genderImage;
  const userGender = audioData.additionalData?.gender || audioData.userData?.gender || "";

  // Determinar qué imagen usar según el género
  if (userGender.toLowerCase() === "male" || userGender.toLowerCase() === "masculino") {
    return genderImages.male || genderImages.base;
  } else if (userGender.toLowerCase() === "female" || userGender.toLowerCase() === "femenino") {
    return genderImages.female || genderImages.base;
  }

  return genderImages.base;
};

// Obtener texto corregido desde audioMotive.generatedSections
export const getTextoCorregidoDesdeGuion = (
  audioData: AudioRequest | null,
  audioN: number
): string | null => {
  if (!audioData?.audioMotive?.generatedSections) return null;
  
  let audioInicio = 1;
  
  for (let i = 0; i < audioData.audioMotive.generatedSections.length; i++) {
    const generatedSection = audioData.audioMotive.generatedSections[i];
    
    if (generatedSection.texts && Array.isArray(generatedSection.texts)) {
      const audioFin = audioInicio + generatedSection.texts.length - 1;
      
      if (audioN >= audioInicio && audioN <= audioFin) {
        const textoIndex = audioN - audioInicio;
        return generatedSection.texts[textoIndex];
      }
      
      audioInicio = audioFin + 1;
    }
  }
  
  return null;
};

// Procesar resultados únicos de errores y correcciones
export const processUniqueResults = (
  erroresAudios: any[],
  correccionesManuales: any[]
): any[] => {
  const allResults = erroresAudios.flatMap((bloque: any) => [
    ...(bloque.toRetry || []),
  ]);

  const allResultsConCorrecciones = [...allResults, ...correccionesManuales];

  const ultimoPorAudioN: Record<number, any> = {};
  allResultsConCorrecciones.forEach((item: any) => {
    if (
      !ultimoPorAudioN[item.audioN] ||
      item.attempt > ultimoPorAudioN[item.audioN].attempt
    ) {
      ultimoPorAudioN[item.audioN] = item;
    }
  });

  return Object.values(ultimoPorAudioN);
};

// Preparar datos para el grid principal
export const prepareGridData = (audioData: AudioRequest | null, audio: any) => {
  
  return audioData
    ? [
        {
          ...audioData,
          audioUrl: audio?.audioUrl || "",
          audioUrlPlay: audio?.audioUrl || "",
          imageUrl: getImageUrlFromSettings(audioData) || audio?.imageUrl || "",
          // Asegurar que userData se mantenga
          userData: audioData.userData,
        },
      ]
    : [];
};

// Preparar datos para el historial
export const prepareHistoryData = (historyAudios: UnifiedAudioRequest[]) => {
  return historyAudios.map((audio) => ({
    ...audio,
    audioUrl: audio.audioUrl,
  }));
};

// Crear payload para reprocesamiento
export const createReprocessPayload = (audioId: string, retryData: any) => {
  return {
    task: audioId,
    retry: retryData
  };
};

// Filtrar audios únicos por attempt para errores
export const filterUniqueAudiosByAttempt = (erroresAudiosOriginales: any[]) => {
  return erroresAudiosOriginales.map((bloque, bloqueIdx) => {
    const vistos = new Set();
    const audios = (bloque.toRetry || [])
      .filter((item: any) => item.attempt === 1)
      .filter((item: any) => {
        if (vistos.has(item.audioN)) return false;
        vistos.add(item.audioN);
        return true;
      });

    return { ...bloque, audios, bloqueIdx };
  }).filter(bloque => bloque.audios.length > 0);
};
