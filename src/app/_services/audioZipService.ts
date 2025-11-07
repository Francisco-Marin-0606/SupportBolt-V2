import { buildApiUrl } from '@/config';
import JSZip from 'jszip';
import { fetchWithTokenRefresh } from './tokenService';

export interface AudioZipData {
  [sectionId: string]: {
    [audioIndex: string]: string; // Blob URL
  };
}

/**
 * Descarga y descomprime un ZIP de audios desde el backend
 * @param userId - ID del usuario
 * @param audioRequestId - ID del audio request
 * @returns Objeto con las URLs de los audios organizados por sección e índice
 */
export async function downloadAndUnzipAudios(
  userId: string,
  audioRequestId: string
): Promise<AudioZipData> {
  try {
    // 1. Construir la URL del endpoint
    const endpoint = `/mmg-audio-requests/get-audio-zipped/${userId}/${audioRequestId}`;
    const url = buildApiUrl(endpoint);

    // 2. Usar fetchWithTokenRefresh para manejo automático de tokens
    const response = await fetchWithTokenRefresh(url, {
      method: 'GET',
    });

    if (!response.ok) {
      throw new Error(`Error al descargar ZIP: ${response.status} ${response.statusText}`);
    }

    // 3. Obtener el contenido como ArrayBuffer
    const arrayBuffer = await response.arrayBuffer();

    // 4. Descomprimir el ZIP con JSZip
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 5. Procesar los archivos del ZIP
    const audioData: AudioZipData = {};

    // Iterar sobre todos los archivos en el ZIP
    for (const [filePath, file] of Object.entries(zip.files)) {
      // Saltar directorios
      if (file.dir) continue;

      // La estructura es: sectionId/audioIndex.mp3 (o .wav, etc.)
      // Ejemplo: "0/0.mp3", "1/3.wav"
      const pathParts = filePath.split('/');
      
      if (pathParts.length === 2) {
        const sectionId = pathParts[0];
        const audioFileName = pathParts[1];
        
        // Extraer el índice del audio (nombre sin extensión)
        const audioIndex = audioFileName.split('.')[0];

        // Verificar que sea un archivo de audio
        if (audioFileName.match(/\.(mp3|wav|ogg|m4a|aac)$/i)) {
          // Obtener el contenido como Blob
          const blob = await file.async('blob');
          
          // Crear una URL temporal para el Blob
          const audioUrl = URL.createObjectURL(blob);

          // Organizar en la estructura de datos
          if (!audioData[sectionId]) {
            audioData[sectionId] = {};
          }
          
          audioData[sectionId][audioIndex] = audioUrl;
        }
      }
    }

    return audioData;
  } catch (error) {
    console.error('Error al descargar y descomprimir ZIP:', error);
    throw error;
  }
}

/**
 * Limpia todas las URLs de Blob creadas
 * @param audioData - Datos de audio con URLs de Blob
 */
export function cleanupAudioUrls(audioData: AudioZipData): void {
  Object.values(audioData).forEach(section => {
    Object.values(section).forEach(url => {
      URL.revokeObjectURL(url);
    });
  });
}

