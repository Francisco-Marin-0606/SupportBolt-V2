import { ScriptSectionProps } from "@/app/types/audioDetail";
import { AudioRequest } from "@/app/types/audioRequest";
import { AudioPlayerCustom } from "@/components/ui/AudioPlayerCustom";
import EmptyState from "@/components/ui/table/EmptyState";
import { useCallback, useEffect, useMemo, useState } from "react";

interface ExtendedScriptSectionProps extends ScriptSectionProps {
  audioData: AudioRequest | null;
  audioId: string;
  audioUrl?: string;
  retryData: any;
  audiosCorrregidosManualmente: Set<number>;
  times: {timeStart: number, timeEnd: number}[];
  onSave: () => void;
  onUpdateRetry: (sectionIndex: number, textIndex: number, newText: string, originalText: string, audioID?: number) => void;
  onRemoveFromRetry: (sectionIndex: number, textIndex: number, audioID?: number) => void;
  onToggleTextRegen: (sectionIndex: number, textIndex: number) => void;
  onToggleRemakeAll: (sectionIndex: number) => void;
  getTextRetryState: (sectionIndex: number, textIndex: number) => any;
  showAlert: (type: "success" | "error", message: string) => void;
  editingSections: Set<number>;
  setEditingSections: (sections: Set<number>) => void;
  setAudioData: (data: AudioRequest) => void;
  // Props para resaltar errores de transcripción del último errorStatus
  errorSectionId?: number | null;
  failedAudioIds?: number[];
}

export const ScriptSection = ({
  script,
  time,
  index,
  correcciones = [],
  audioData,
  audioId,
  audioUrl,
  retryData,
  audiosCorrregidosManualmente,
  times,
  onSave,
  onUpdateRetry,
  onRemoveFromRetry,
  onToggleTextRegen,
  onToggleRemakeAll,
  getTextRetryState,
  showAlert,
  editingSections,
  setEditingSections,
  setAudioData,
  errorSectionId,
  failedAudioIds,
}: ExtendedScriptSectionProps) => {
  const [editedScript, setEditedScript] = useState<string[]>(script);
  const isEditing = editingSections.has(index);

  // Función para obtener el texto actualizado considerando retryData
  const getUpdatedScript = useCallback(() => {
    if (!retryData?.sections) return [...script];
    
    // Buscar si hay datos de retry para esta sección
    const sectionRetry = retryData.sections.find((s: any) => s.sectionId === index);
    if (!sectionRetry) return [...script];
    
    // Si remakeALL está activo, usar el script original
    if (sectionRetry.remakeALL) return [...script];
    
    // Aplicar correcciones individuales
    const updatedScript = [...script];
    sectionRetry.texts.forEach((textRetry: any) => {
      if (textRetry.textToUse && textRetry.index < updatedScript.length) {
        updatedScript[textRetry.index] = textRetry.textToUse;
      }
    });
    
    return updatedScript;
  }, [script, retryData, index]);

  // Inicialización - Actualiza cuando cambia el script, retryData o se sale del modo edición
  useEffect(() => {
    if (!isEditing) {
      const updatedScript = getUpdatedScript();
      setEditedScript(updatedScript);
    }
  }, [script, retryData, isEditing, getUpdatedScript]);


  // Mapeo perfecto: Audio N° → Personalización basado en distribución secuencial
  const correccionesEstaPersonalizacion = useMemo(() => {
    if (!correcciones || correcciones.length === 0) return [];

    // Calcular el rango de Audio N° para esta personalización
    let audioInicio = 1;
    for (let i = 0; i < index; i++) {
      audioInicio +=
        audioData?.audioMotive?.generatedSections?.[i]?.texts?.length || 0;
    }

    const audioFin = audioInicio + (script?.length || 0) - 1;

    // Filtrar correcciones que corresponden a esta personalización
    const correccionesPersonalizacion = correcciones.filter(
      (correccion: any) => {
        const audioN = parseInt(correccion.audioN);
        return audioN >= audioInicio && audioN <= audioFin;
      }
    );

    return correccionesPersonalizacion;
  }, [correcciones, index, script, audioData]);

  // Función para verificar si un texto específico fue corregido manualmente
  const esTextoCorregidoManualmente = (textoIndex: number) => {
    let audioInicio = 1;
    for (let i = 0; i < index; i++) {
      audioInicio +=
        audioData?.audioMotive?.generatedSections?.[i]?.texts?.length || 0;
    }
    
    const numeroAudio = audioInicio + textoIndex;
    return audiosCorrregidosManualmente.has(numeroAudio);
  };

  // Determina si una línea debe marcarse como error (rojo) según último error
  const esLineaConError = (textoIndex: number) => {
    const isSameSection = (errorSectionId ?? -1) === index;
    const isFailedAudio = failedAudioIds?.includes(textoIndex) ?? false;
    return isSameSection && isFailedAudio && !esTextoCorregidoManualmente(textoIndex);
  };

  // Función para determinar si un texto debe ser excluido del mapeo
  const debeExcluirTexto = (textoIndex: number) => {
    // Si es el primer texto, no puede ser excluido
    if (textoIndex === 0) return false;
    
    // Verificar si el texto anterior es corregido manualmente
    const textoAnteriorCorregido = esTextoCorregidoManualmente(textoIndex - 1);
    
    // Verificar si el texto actual es de error
    const textoActualEsError = esLineaConError(textoIndex);
    
    // Excluir si el anterior es corregido Y el actual es error
    return textoAnteriorCorregido && textoActualEsError;
  };

  // Función para manejar los cambios en los campos de texto
  const handleTextChange = (textIndex: number, value: string) => {
    const newScript = [...editedScript];
    newScript[textIndex] = value;
    setEditedScript(newScript);
    
    // Obtener el audioID del audio correspondiente
    const section = audioData?.audioMotive?.generatedSections?.[index];
    const audioItem = section?.audios?.[textIndex];
    const audioID = audioItem?.audioID;
    
    if (!audioID) {
      console.warn(`⚠️ No se encontró audioID para el texto en posición ${textIndex} de la sección ${index}`);
    }
    
    // Agregar/actualizar inmediatamente en retry cuando cambia el texto
    const originalText = script[textIndex];
    if (value !== originalText) {
      // Si el texto es diferente al original, agregarlo al retry
      onUpdateRetry(index, textIndex, value, originalText, audioID);
    } else {
      // Si el texto vuelve al original, removerlo del retry
      onRemoveFromRetry(index, textIndex, audioID);
    }
  };

  // Función de guardado simplificada - Solo actualiza retryData, NO toca el guión original
  const handleSave = useCallback(async () => {
    if (!audioData) return;
    
    try {
      // Salir del modo edición
      const newSet = new Set(editingSections);
      newSet.delete(index);
      setEditingSections(newSet);
      
      // Actualizar retry data si hay cambios
      // IMPORTANTE: NO modificar audioData.texts (guión original del backend)
      editedScript.forEach((text, textIndex) => {
        const originalText = script[textIndex];
        if (text !== originalText) {
          // Obtener el audioID del audio correspondiente
          const section = audioData?.audioMotive?.generatedSections?.[index];
          const audioItem = section?.audios?.[textIndex];
          const audioID = audioItem?.audioID;
          
          onUpdateRetry(index, textIndex, text, originalText, audioID);
        }
      });
      
      onSave();
      showAlert("success", "Cambios guardados localmente");
      
    } catch (error) {
      console.error("Error al guardar:", error);
      showAlert("error", "Error al guardar los cambios");
    }
  }, [audioData, editedScript, index, script, onUpdateRetry, onSave, showAlert, setEditingSections, editingSections]);


  return (
    <div className="bg-white rounded-[20px] p-6 mt-6">
      <div className="flex justify-between items-start mb-6">
        {/* Lado izquierdo: Título + Reproductor */}
        <div className="flex items-center gap-6">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Personalización {index + 1}
            </h2>
            <p className="text-gray-500">{time}</p>
          </div>
          
          {/* Reproductor de audio */}
          {audioUrl && times[index] && (
            <AudioPlayerCustom
              src={audioUrl}
              timeStart={times[index].timeStart}
              timeEnd={times[index].timeEnd}
            />
          )}
        </div>

        <div className="flex gap-3 items-center flex-shrink-0">
          <button
            className="px-6 py-2 border-2 border-black rounded-lg font-medium hover:bg-gray-50 transition-colors min-w-[100px]"
            onClick={() => {
              if (isEditing) {
                handleSave();
              } else {
                const newSet = new Set(editingSections);
                newSet.add(index);
                setEditingSections(newSet);
              }
            }}
          >
            {isEditing ? "Listo" : "Editar"}
          </button>

          {/* Botón Re-Procesar Sección */}
          <button
            onClick={() => onToggleRemakeAll(index)}
            className={`px-4 py-2 rounded-lg font-medium transition-colors min-w-[140px] ${
              (() => {
                const sectionInRetry = retryData?.sections.find((s: any) => s.sectionId === index);

                return sectionInRetry?.remakeALL
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300";
              })()
            }`}
          >
            {(() => {
              const sectionInRetry = retryData?.sections.find((s: any) => s.sectionId === index);
              return sectionInRetry?.remakeALL 
                ? "✅ Re-Procesar Sección" 
                : "🔄 Re-Procesar Sección";
            })()}
          </button>
        </div>
      </div>

      {/* Contenido del script */}
      <div className="space-y-4">
        {editedScript.length > 0 ? (
          editedScript
            .map((line, idx) => ({ line, idx })) // Crear array con índice
            .filter(({ idx }) => !debeExcluirTexto(idx)) // Aplicar filtro
            .map(({ line, idx }) => (
              <div key={idx} className="flex gap-4">
                {esTextoCorregidoManualmente(idx) ? (
                  // Solo las líneas corregidas tienen el contenedor especial con fondo verde
                  <div className="flex gap-4 p-3 rounded-lg bg-green-50 border-l-4 border-green-400 w-full transition-colors">
                    <span className="text-green-600 font-medium">
                      {idx < 9 && "0"}{idx + 1}
                      <span className="ml-2 text-green-600" title="Corregido manualmente">
                        ✓
                      </span>
                    </span>
                    {isEditing ? (
                      <textarea
                        value={line}
                        onChange={(e) => handleTextChange(idx, e.target.value)}
                        className="w-full p-2 border border-green-300 focus:ring-green-500 bg-green-50 rounded-md focus:outline-none focus:ring-2"
                        rows={2}
                      />
                    ) : (
                      <div className="w-full">
                        {(() => {
                          const retrySection = retryData?.sections?.find((s: any) => s.sectionId === index);
                          const retryEntry = retrySection?.texts?.find((t: any) => t.index === idx);
                          const isEditedFromRetry = !!(retryEntry && !retryEntry.regen && retryEntry.textToUse);
                          const displayText = isEditedFromRetry ? retryEntry.textToUse : line;
                          return (
                            <p className="text-green-800 font-medium mb-2">
                              {displayText}
                              <span className="ml-2 text-xs text-green-600 font-semibold">
                                (CORREGIDO)
                              </span>
                              {isEditedFromRetry && (
                                <span className="ml-2 text-xs text-green-700 font-bold">(EDITADO)</span>
                              )}
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  // Las líneas normales mantienen el formato original SIN padding extra
                  <>
                    <span className="text-gray-400 font-medium">{idx < 9 && "0"}{idx + 1}</span>
                    {isEditing ? (
                      <div className="w-full">
                        <textarea
                          value={line}
                          onChange={(e) => handleTextChange(idx, e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
                          rows={2}
                        />
                      </div>
                    ) : (
                      <div className="w-full">
                        {(() => {
                          const retrySection = retryData?.sections?.find((s: any) => s.sectionId === index);
                          const retryEntry = retrySection?.texts?.find((t: any) => t.index === idx);
                          const isEditedFromRetry = !!(retryEntry && !retryEntry.regen && retryEntry.textToUse);
                          const displayText = isEditedFromRetry ? retryEntry.textToUse : line;
                          const isError = esLineaConError(idx);
                          const baseClass = isEditedFromRetry ? "text-green-700 font-medium mb-2" : "mb-2";
                          const colorClass = isError ? "text-red-600 font-semibold" : (!isEditedFromRetry ? "text-gray-600" : "");
                          return (
                            <p className={`${baseClass} ${colorClass}`}>
                              {displayText}
                              {isEditedFromRetry && (
                                <span className="ml-2 text-xs text-green-600 font-semibold">(EDITADO)</span>
                              )}
                              {isError && (
                                <span className="ml-2 text-xs text-red-600 font-bold">(ERROR)</span>
                              )}
                            </p>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
        ) : (
          <EmptyState
            title="No hay texto disponible"
            description="No se ha generado el guión de hipnosis o no hay texto para mostrar."
          />
        )}

        {/* Correcciones manuales - Solo mostrar si hay correcciones que no están ya aplicadas en el guión */}
        {correccionesEstaPersonalizacion.length > 0 && (
          <div className="mt-6 border-t-2 border-blue-200 pt-4">
            <h4 className="text-lg font-bold text-blue-800 mb-3">
              🔧 Correcciones Manuales:
            </h4>
            {correccionesEstaPersonalizacion
              .filter((correccion: any) => {
                // Solo mostrar correcciones que no están ya aplicadas en el guión actual
                let audioInicio = 1;
                for (let i = 0; i < index; i++) {
                  audioInicio +=
                    audioData?.audioMotive?.generatedSections?.[i]?.texts?.length || 0;
                }
                const audioN = parseInt(correccion.audioN);
                const textoIndex = audioN - audioInicio;
                const textoActualEnGuion = editedScript[textoIndex];
                return textoActualEnGuion !== correccion.transcription;
              })
              .map((correccion: any, idx: number) => (
                <div
                  key={idx}
                  className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3 rounded-r-md"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-blue-600 text-white px-2 py-1 rounded-full text-sm font-bold">
                      Audio N°{correccion.audioN}
                    </span>
                    <span className="text-green-700 font-bold">
                      CORRECCIÓN APLICADA
                    </span>
                  </div>
                  <p className="text-gray-700">
                    <span className="font-semibold">
                      Transcripción corregida:
                    </span>{" "}
                    "{correccion.transcription}"
                  </p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};
