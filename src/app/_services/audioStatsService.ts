import { Connection } from './connectionService';

const connection = new Connection();
const MMG_API = 'mmg-audio-stats';

interface AudioStats {
  enviados: number;
  error: number;
  review: number;
  pending: number;
  completed: number;
}

export async function getAudioStats(): Promise<AudioStats> {
  try {
    const response = await connection.get<AudioStats>(`${MMG_API}/stats`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error('Error in getAudioStats:', error);
    throw error;
  }
}

export async function getAudiosByStatus(status: string, page: number = 1, limit: number = 10): Promise<{
  data: any[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  try {
    const response = await connection.get(`${MMG_API}/by-status/${status}`, {
      params: { page, limit }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data as {
      data: any[];
      metadata: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
  } catch (error) {
    console.error('Error in getAudiosByStatus:', error);
    throw error;
  }
}

export async function searchAudios(query: string, page: number = 1, limit: number = 10): Promise<{
  data: any[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  try {
    const response = await connection.get(`${MMG_API}/search`, {
      params: { q: query, page, limit }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data as {
      data: any[];
      metadata: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    };
  } catch (error) {
    console.error('Error in searchAudios:', error);
    throw error;
  }
} 