"use client";
import { getAudioRequestStats } from '@/app/_services/audioRequestService';
import { AudioRequestStats } from '@/app/types/audioRequest';
import { useQuery } from '@tanstack/react-query';

export const useAudioStats = () => {
  return useQuery({
    queryKey: ['audioStats'],
    queryFn: async (): Promise<AudioRequestStats> => {
      const response = await getAudioRequestStats();
      return response;
    },
    staleTime: Infinity, // Nunca considerar la data como stale automáticamente
    gcTime: Infinity, // Nunca eliminar del cache automáticamente
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // Solo refetch manual
    retry: 2,
  });
}; 