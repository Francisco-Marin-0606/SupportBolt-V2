import { RetryData } from "@/app/types/audioDetail";
import { useCallback } from "react";

export const useRetryLogic = (
  retryData: RetryData | null,
  setRetryData: (data: RetryData) => void
) => {
  
  // Actualizar estructura de retry
  const updateRetryStructure = useCallback((
    sectionIndex: number,
    textIndex: number,
    newText: string,
    originalText: string,
    audioID?: number
  ) => {
    if (newText === originalText) {
      return;
    }

    const baseRetry = retryData || { sections: [] };

    // Buscar si la sección ya existe
    const existingSectionIndex = baseRetry.sections.findIndex(section => section.sectionId === sectionIndex);
    
    if (existingSectionIndex !== -1) {
      // La sección ya existe, actualizarla
      const existingSection = baseRetry.sections[existingSectionIndex];
      
      if (existingSection.remakeALL) {
        console.warn("❌ No se puede editar texto individual cuando remakeALL está activo");
        return;
      }

      // Buscar por audioID si está disponible, sino por index
      const existingTextIdx = audioID 
        ? existingSection.texts.findIndex(t => t.audioID === audioID)
        : existingSection.texts.findIndex(t => t.index === textIndex);
      
      if (existingTextIdx === -1) {
        // El texto no existe en esta sección, agregarlo
        if (!newText) {
          console.error("❌ textToUse no puede ser null cuando regen es false");
          return;
        }
        
        const updatedSections = [...baseRetry.sections];
        updatedSections[existingSectionIndex] = {
          ...existingSection,
          texts: [
            ...existingSection.texts,
            { 
              audioID: audioID,
              index: textIndex, 
              textToUse: newText, 
              regen: false 
            }
          ],
        };
        
        setRetryData({ ...baseRetry, sections: updatedSections });
      } else {
        // El texto ya existe, actualizarlo
        const updatedSections = [...baseRetry.sections];
        updatedSections[existingSectionIndex] = {
          ...existingSection,
          texts: existingSection.texts.map(t => {
            const matches = audioID ? t.audioID === audioID : t.index === textIndex;
            if (!matches) return t;
            if (t.regen) return t; // no tocar textToUse si regen=true
            return { ...t, textToUse: newText };
          }),
        };
        
        setRetryData({ ...baseRetry, sections: updatedSections });
      }
    } else {
      // La sección no existe, crear una nueva
      if (!newText) {
        console.error("❌ textToUse no puede ser null cuando regen es false");
        return;
      }
      
      const newSection = {
        sectionId: sectionIndex,
        remakeALL: false,
        texts: [{ 
          audioID: audioID,
          index: textIndex, 
          textToUse: newText, 
          regen: false 
        }],
      };
      
      setRetryData({ 
        ...baseRetry, 
        sections: [...baseRetry.sections, newSection] 
      });
    }
  }, [retryData, setRetryData]);

  // Alternar el valor de regen de un texto específico (inmutable y por texto)
  const toggleTextRegen = useCallback((sectionIndex: number, textIndex: number, audioID?: number) => {
    const baseRetry = retryData || { sections: [] };

    let sectionExists = false;
    const updatedSections = baseRetry.sections.map(section => {
      if (section.sectionId !== sectionIndex) return section;
      sectionExists = true;

      // Buscar por audioID si está disponible, sino por index
      const existingTextIdx = audioID
        ? section.texts.findIndex(t => t.audioID === audioID)
        : section.texts.findIndex(t => t.index === textIndex);
        
      if (existingTextIdx === -1) {
        // Crear texto con regen=true
        return {
          ...section,
          remakeALL: false,
          texts: [
            ...section.texts,
            { audioID: audioID, index: textIndex, textToUse: null, regen: true }
          ],
        };
      }

      // Toggle inmutable sobre el texto objetivo
      const newTexts = section.texts.map(t => {
        const matches = audioID ? t.audioID === audioID : t.index === textIndex;
        if (!matches) return t;
        const newRegen = !t.regen;
        return {
          ...t,
          regen: newRegen,
          textToUse: newRegen ? null : t.textToUse,
        };
      });

      return { ...section, texts: newTexts };
    });

    const finalSections = sectionExists
      ? updatedSections
      : [
          ...updatedSections,
          {
            sectionId: sectionIndex,
            remakeALL: false,
            texts: [{ audioID: audioID, index: textIndex, textToUse: null, regen: true }],
          },
        ];

    setRetryData({ ...baseRetry, sections: finalSections });
  }, [retryData, setRetryData]);

  // Alternar remakeALL para una sección
  const toggleRemakeAll = useCallback((sectionIndex: number) => {
    const currentRetry = retryData ? { ...retryData, sections: [...retryData.sections] } : { sections: [] };
    
    let sectionInRetry = currentRetry.sections.find(section => section.sectionId === sectionIndex);
    
    if (!sectionInRetry) {
      currentRetry.sections.push({
        sectionId: sectionIndex,
        remakeALL: true,
        texts: [],
      });
    } else {
      sectionInRetry.remakeALL = !sectionInRetry.remakeALL;
      if (sectionInRetry.remakeALL) {
        sectionInRetry.texts = [];
      }
    }
    
    setRetryData(currentRetry);
  }, [retryData, setRetryData]);

  // Obtener estado de retry de un texto
  const getTextRetryState = useCallback((sectionIndex: number, textIndex: number, audioID?: number) => {
    if (!retryData) return null;
    
    const sectionInRetry = retryData.sections.find(
      section => section.sectionId === sectionIndex
    );
    
    if (!sectionInRetry) return null;
    
    // Buscar por audioID si está disponible, sino por index
    return audioID
      ? sectionInRetry.texts.find(text => text.audioID === audioID)
      : sectionInRetry.texts.find(text => text.index === textIndex);
  }, [retryData]);

  // Remover un texto del retry (cuando vuelve al valor original)
  const removeFromRetry = useCallback((sectionIndex: number, textIndex: number, audioID?: number) => {
    if (!retryData) return;

    const currentRetry = { ...retryData };
    const sectionInRetry = currentRetry.sections.find(
      section => section.sectionId === sectionIndex
    );
    
    if (!sectionInRetry) return;

    // Filtrar el texto específico (por audioID si está disponible, sino por index)
    sectionInRetry.texts = audioID
      ? sectionInRetry.texts.filter(text => text.audioID !== audioID)
      : sectionInRetry.texts.filter(text => text.index !== textIndex);

    // Si la sección queda sin textos y no está en remakeALL, remover la sección
    if (sectionInRetry.texts.length === 0 && !sectionInRetry.remakeALL) {
      currentRetry.sections = currentRetry.sections.filter(
        section => section.sectionId !== sectionIndex
      );
    }

    // Si no quedan secciones, limpiar todo
    if (currentRetry.sections.length === 0) {
      setRetryData({ sections: [] });
    } else {
      setRetryData(currentRetry);
    }
  }, [retryData, setRetryData]);

  return {
    updateRetryStructure,
    removeFromRetry,
    toggleTextRegen,
    toggleRemakeAll,
    getTextRetryState,
  };
};
