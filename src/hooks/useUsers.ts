"use client";
import { findAll, FindAllQueryDto } from '@/app/_services/mmgUserService';
import { User } from '@/app/types/user';
import { useQuery } from '@tanstack/react-query';

interface UserWithId extends User {
  _id: string;
  source: string;
  device: string | null;
  language?: "es" | "en";
  email: string; // Agregar email explícitamente
}

interface UseUsersParams {
  page: number;
  pageSize: number;
  query: string;
  sortField: string;
  sortDirection: 'asc' | 'desc';
  memberStatus: 'all' | 'active' | 'trial';
  userLevel: string;
  language: 'es' | 'en' | 'all';
}

interface UsersResponse {
  data: UserWithId[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export const useUsers = (params: UseUsersParams) => {
  const queryParams: FindAllQueryDto = {
    page: params.page,
    limit: params.pageSize,
    sortBy: params.sortField,
    sortOrder: params.sortDirection,
  };

  // Solo agregar parámetros de búsqueda si hay query
  if (params.query.trim()) {
    queryParams.names = params.query;
    queryParams.email = params.query;
    queryParams.lastnames = params.query;
  }

  // Solo agregar memberStatus si no es "all"
  if (params.memberStatus !== 'all') {
    queryParams.memberStatus = params.memberStatus;
  }

  // Solo agregar userLevel si tiene valor
  if (params.userLevel && params.userLevel.trim()) {
    queryParams.userLevel = params.userLevel;
  }

  // Solo agregar language si no es "all"
  if (params.language && params.language !== 'all') {
    queryParams.language = params.language;
  }

  const query = useQuery({
    queryKey: [
      'users',
      params.page,
      params.pageSize,
      params.query,
      params.sortField,
      params.sortDirection,
      params.memberStatus,
      params.userLevel,
      params.language,
    ],
    queryFn: async (): Promise<UsersResponse> => {
      const response = await findAll(queryParams);
      
      const usersWithId: UserWithId[] = response.data.map((user) => ({
        ...user,
        _id: user._id as string,
      }));

      return {
        data: usersWithId,
        metadata: response.metadata,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
    retry: 2,
  });

  return {
    ...query,
    isFetching: query.isFetching,
    isPending: query.isPending,
  };
}; 