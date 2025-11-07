"use client";
import { getAudioRequests } from '@/app/_services/audioRequestService';
import { AudioRequest } from '@/app/types/audioRequest';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

interface UnifiedAudioRequest extends AudioRequest {
  imageUrl?: string;
  formattedDuration?: string;
  customData?: any;
  userLevel?: string;
}

interface UseAudiosParams {
  page: number;
  pageSize: number;
  query: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  status: string;
  userLevel: string;
}

interface AudiosResponse {
  data: UnifiedAudioRequest[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Interfaz para los parámetros del query
interface AudioQueryParams {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: string;
  email?: string;
  status?: string;
  userLevel?: string;
}

export const useAudios = (params: UseAudiosParams) => {
  const queryParams: AudioQueryParams = {
    page: params.page,
    limit: params.pageSize,
    sortBy: params.sortField,
    sortOrder: params.sortDirection,
  };

  // Solo agregar parámetros de búsqueda si hay query
  if (params.query.trim()) {
    queryParams.email = params.query;
  }

  // Solo agregar status si tiene valor
  if (params.status && params.status.trim()) {
    queryParams.status = params.status;
  }

  // Solo agregar userLevel si tiene valor
  if (params.userLevel && params.userLevel.trim()) {
    queryParams.userLevel = params.userLevel;
  }

  return useQuery({
    queryKey: [
      'audios',
      params.page,
      params.pageSize,
      params.query,
      params.sortField,
      params.sortDirection,
      params.status,
      params.userLevel,
    ],
    queryFn: async (): Promise<AudiosResponse> => {
      const response = await getAudioRequests(queryParams);
      
      const audiosWithId: UnifiedAudioRequest[] = response.data.map((audio) => ({
        ...audio,
        _id: audio._id || audio.id,
      }));

      return {
        data: audiosWithId,
        metadata: response.metadata,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    retry: 2,
    placeholderData: keepPreviousData, // Esta es la línea clave
  });
}; 