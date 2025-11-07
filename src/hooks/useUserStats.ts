"use client";
import { getMmgUserStats } from '@/app/_services/mmgUserService';
import { MmgUserStats } from '@/app/types/user';
import { useQuery } from '@tanstack/react-query';

export const useUserStats = () => {
  return useQuery({
    queryKey: ['userStats'],
    queryFn: async (): Promise<MmgUserStats> => {
      const response = await getMmgUserStats();
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