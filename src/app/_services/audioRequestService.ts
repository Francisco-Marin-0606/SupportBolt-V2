import {
  AudioRequest,
  AudioRequestStats,
  AudioRequestStatus,
} from "../types/audioRequest";
import { Connection } from "./connectionService";

const connection = new Connection();
const MMG_API = "mmg-audio-requests";

interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface FindAllQueryDto {
  email?: string;
  status?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: string;
  userLevel?: string;
}

// Definir la interfaz para la respuesta
interface AccelerateResponse {
  message: string;
  audioRequest: {
    _id: string;
    requestDate: string;
    publicationDate: string;
  };
}

// Get all audio requests with pagination
export async function getAudioRequests(
  query: FindAllQueryDto
): Promise<PaginatedResponse<AudioRequest>> {
  try {
    const params: Record<string, string | number | boolean> = {
      page: query.page || 1,
      limit: query.limit || 10,
    };

    if (query.email) params.email = query.email;
    if (query.status) params.status = query.status;
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.sortOrder) params.sortOrder = query.sortOrder;
    if (query.userLevel) params.userLevel = query.userLevel;

    const response = await connection.get<PaginatedResponse<AudioRequest>>(
      MMG_API,
      {
        params,
      }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudioRequests:", error);
    throw error;
  }
}

// Get a single audio request by ID
export async function getAudioRequestById(id: string): Promise<AudioRequest> {
  try {
    const response = await connection.get<AudioRequest>(`${MMG_API}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudioRequestById:", error);
    throw error;
  }
}

// Create a new audio request
export async function createAudioRequest(
  audioRequestData: Omit<AudioRequest, "id">
): Promise<AudioRequest> {
  try {
    const response = await connection.post<AudioRequest>(
      MMG_API,
      audioRequestData
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in createAudioRequest:", error);
    throw error;
  }
}

// Get audio requests by user ID
export async function getAudioRequestsByUserId(
  userId: string
): Promise<AudioRequest[]> {
  try {
    const response = await connection.get<AudioRequest[]>(
      `${MMG_API}/user/${userId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudioRequestsByUserId:", error);
    throw error;
  }
}

// Get audio requests by email
export async function getAudioRequestsByEmail(
  email: string
): Promise<AudioRequest[]> {
  try {
    const response = await connection.get<AudioRequest[]>(
      `${MMG_API}/email/${email}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudioRequestsByEmail:", error);
    throw error;
  }
}

// Get audio requests by status
export async function getAudioRequestsByStatus(
  status: AudioRequestStatus
): Promise<AudioRequest[]> {
  try {
    const response = await connection.get<AudioRequest[]>(
      `${MMG_API}/status/${status}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudioRequestsByStatus:", error);
    throw error;
  }
}

// Update audio request status
export async function updateAudioRequestStatus(
  id: string,
  status: AudioRequestStatus
): Promise<AudioRequest> {
  try {
    const response = await connection.patch<AudioRequest>(
      `${MMG_API}/${id}/status`,
      { status }
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in updateAudioRequestStatus:", error);
    throw error;
  }
}

// Add audio request error
export async function addAudioRequestError(
  id: string,
  errorStatus: any
): Promise<AudioRequest> {
  try {
    const response = await connection.patch<AudioRequest>(
      `${MMG_API}/${id}/error`,
      errorStatus
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in addAudioRequestError:", error);
    throw error;
  }
}

// Delete audio request
export async function deleteAudioRequest(id: string): Promise<void> {
  try {
    const response = await connection.delete(`${MMG_API}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error in deleteAudioRequest:", error);
    throw error;
  }
}

// Reprocess audio request
export async function reprocessAudioRequest(
  requestId: string
): Promise<boolean> {
  try {
    const response = await connection.post<boolean>(`${MMG_API}reprocess`, {
      requestId,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in reprocessAudioRequest:", error);
    throw error;
  }
}

// Update audio request
export async function updateAudioRequest(
  id: string,
  audioRequest: AudioRequest
): Promise<AudioRequest> {
  try {
    const response = await connection.patch<AudioRequest>(
      `${MMG_API}/${id}`,
      audioRequest
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in updateAudioRequest:", error);
    throw error;
  }
}

// Search audio requests
export async function searchAudioRequests(
  query: string
): Promise<AudioRequest[]> {
  try {
    const response = await connection.get<AudioRequest[]>(`${MMG_API}/search`, {
      params: { q: query },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in searchAudioRequests:", error);
    throw error;
  }
}

// Reprocess audio request v2 (nueva función)
export async function reprocessAudioRequestV2(
  payload: {
    task: string;
    retry: {
      sections: {
        sectionId: number;
        remakeALL: boolean;
        texts: {
          audioID?: number;
          index?: number;
          textToUse?: string | null;
          regen: boolean;
        }[];
        additionalProp1?: any;
      }[];
    } | null;
    fromScript?: boolean;
  }
): Promise<any> {

  
  try {
    const query = new URLSearchParams({ priority: 'false' }).toString();



    const response = await fetch(`/api/tasks/retry?${query}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });


    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  } catch (error) {
    console.error('Error in reprocessAudioRequestV2:', error);
    throw error;
  }
};

export async function acceleratePublication(
  id: string
): Promise<AccelerateResponse> {
  const response = await connection.post(
    `${MMG_API}/accelerate-publication-date-new-era/${id}`,
    {}
  );
  if (!response.ok) {
    throw new Error("Error al acelerar la publicación");
  }
  return response.data as AccelerateResponse;
}

export async function getAudioRequestStats(): Promise<AudioRequestStats> {
  const response = await connection.get<AudioRequestStats>(`${MMG_API}/totals`);
  if (!response.ok) {
    throw new Error(
      "Error al obtener las estadísticas de las solicitudes de audio"
    );
  }
  return response.data;
}

// Set audio as completed
export async function setVariousAudiosCompleted(id: string, audios: { section: number, audio: number }[]): Promise<any> {
  try {
    const response = await connection.post<any>(
    `${MMG_API}/set-various-audios-completed`,
    {
      id,
      audios,
    }
  );
  if (!response.ok) {
    throw new Error("Error al marcar los audios como completados");
    }
    return response.data;
  } catch (error) {
    console.error("Error in setAudioCompleted:", error);
    throw error;
  }
}

