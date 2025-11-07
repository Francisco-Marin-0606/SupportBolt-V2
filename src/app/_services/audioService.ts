import { Audio, AudioItem } from "../types/audio";
import { Connection } from "./connectionService";

const connection = new Connection();
const MMG_API = "mmg-audios";

// Create a new audio collection
export async function createAudio(
  audioData: Omit<Audio, "id">
): Promise<Audio> {
  try {
    const response = await connection.post<Audio>(MMG_API, audioData);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in createAudio:", error);
    throw error;
  }
}

// Get all audio collections with pagination
export async function getAudios(
  page: number = 1,
  limit: number = 10
): Promise<{
  data: Audio[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  try {
    const response = await connection.get<{
      data: Audio[];
      metadata: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(MMG_API, {
      params: { page, limit },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudios:", error);
    throw error;
  }
}

// Get audio collection by ID
export async function getAudioById(id: string): Promise<Audio> {
  try {
    const response = await connection.get<Audio>(`${MMG_API}/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudioById:", error);
    throw error;
  }
}

// Get all audio collections by user ID
export async function getAudiosByUserId(userId: string): Promise<Audio[]> {
  try {
    const response = await connection.get<Audio[]>(`${MMG_API}/user/${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudiosByUserId:", error);
    throw error;
  }
}

// Get all audio collections by request ID
export async function getAudiosByRequestId(
  requestId: string
): Promise<AudioItem[]> {
  try {
    const response = await connection.get<AudioItem[]>(
      `${MMG_API}/request/${requestId}`
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getAudiosByRequestId:", error);
    throw error;
  }
}

// Update audio collection
export async function updateAudio(
  id: string,
  audioData: Partial<Audio>
): Promise<Audio> {
  try {
    const response = await connection.patch<Audio>(
      `${MMG_API}/${id}`,
      audioData
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in updateAudio:", error);
    throw error;
  }
}

// Add audio item to user's collection
export async function addAudioItem(
  userId: string,
  audioItemData: Omit<AudioItem, "id">
): Promise<AudioItem> {
  try {
    const response = await connection.post<AudioItem>(
      `${MMG_API}/user/${userId}/items`,
      audioItemData
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in addAudioItem:", error);
    throw error;
  }
}

// Update audio item in user's collection
export async function updateAudioItem(
  userId: string,
  audioRequestId: string,
  audioItemData: Partial<AudioItem>
): Promise<AudioItem> {
  try {
    const response = await connection.patch<AudioItem>(
      `${MMG_API}/user/${userId}/items/${audioRequestId}`,
      audioItemData
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in updateAudioItem:", error);
    throw error;
  }
}

// Remove audio item from user's collection
export async function removeAudioItem(
  userId: string,
  audioRequestId: string
): Promise<void> {
  try {
    const response = await connection.delete<void>(
      `${MMG_API}/user/${userId}/items/${audioRequestId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error in removeAudioItem:", error);
    throw error;
  }
}

// Delete audio collection
export async function deleteAudio(id: string): Promise<void> {
  try {
    const response = await connection.delete<void>(`${MMG_API}/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error in deleteAudio:", error);
    throw error;
  }
}
