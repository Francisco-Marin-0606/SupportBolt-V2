import { addMonths, addYears } from "@/app/utils/utils";
import { MmgUserStats, User } from "../types/user";
import { connection } from "./connectionService";

const MMG_API = "/mmg-users";

export interface FindAllQueryDto {
  page?: number;
  limit?: number;
  names?: string;
  email?: string;
  lastnames?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  memberStatus?: "all" | "active" | "trial";
  userLevel?: string; // Agregar userLevel
  language?: "es" | "en" | "all"; // Agregar filtro de idioma
}

interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface CancelledUserData {
  _doc: User;
  cancellationInfo: {
    daysSinceCancellation: number;
    lastPaymentDate: string;
    membershipType: string;
    estimatedCancellationDate: string;
  };
}

// Get all MMG users with pagination and filters
export async function findAll(
  query: FindAllQueryDto
): Promise<PaginatedResponse<User & { source: string }>> {
  try {
    const params: Record<string, string | number | boolean> = {
      page: query.page || 1,
      limit: query.limit || 10,
    };

    if (query.email) params.email = query.email;
    if (query.names) params.names = query.names;
    if (query.lastnames) params.lastnames = query.lastnames;
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.sortOrder) params.sortOrder = query.sortOrder;
    if (query.memberStatus) params.memberStatus = query.memberStatus;
    if (query.userLevel) params.userLevel = query.userLevel; // Agregar userLevel
    if (query.language && query.language !== "all") params.language = query.language; // Agregar filtro de idioma

    const response = await connection.get<PaginatedResponse<User & { source: string }>>(
      `${MMG_API}/findAll`,
      {
        params,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in findAll:", error);
    throw error;
  }
}

// Get a single MMG user by ID
export async function findOne(id: string): Promise<User> {
  try {
    const response = await connection.get<User>(`${MMG_API}/findAll/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in findOne:", error);
    throw error;
  }
}

// Update user email
export async function updateEmail(
  userId: string,
  updateEmailDto: { email: string }
): Promise<User> {
  try {
    const response = await connection.patch<User>(
      `${MMG_API}/updateEmail/email/${userId}`,
      updateEmailDto
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in updateEmail:", error);
    throw error;
  }
}

// Update user gender
export async function updateGender(
  userId: string,
  updateGenderDto: { gender: string }
): Promise<User> {
  try {
    const response = await connection.patch<User>(
      `${MMG_API}/${userId}`,
      updateGenderDto
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in updateGender:", error);
    throw error;
  }
}

// Create a new MMG user
export async function createMmgUser(userData: Omit<User, "id">): Promise<User> {
  try {
    const response = await connection.post<User>(MMG_API, userData);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in createMmgUser:", error);
    throw error;
  }
}

// Update an MMG user
export async function updateMmgUser(
  id: string,
  userData: Partial<User>
): Promise<User> {
  try {
    const response = await connection.patch<User>(`${MMG_API}/${id}`, userData);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in updateMmgUser:", error);
    throw error;
  }
}

// Delete an MMG user
export async function deleteMmgUser(id: string): Promise<void> {
  try {
    const response = await connection.delete(`${MMG_API}/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error in deleteMmgUser:", error);
    throw error;
  }
}

// Search MMG users
export async function searchMmgUsers(query: string): Promise<User[]> {
  try {
    const response = await connection.get<User[]>(`${MMG_API}/search`, {
      params: { q: query },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in searchMmgUsers:", error);
    throw error;
  }
}

// Update MMG user status
export async function updateMmgUserStatus(
  id: string,
  status: User["status"]
): Promise<User> {
  try {
    const response = await connection.patch<User>(`${MMG_API}/${id}/status`, {
      status,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in updateMmgUserStatus:", error);
    throw error;
  }
}

export async function getMmgUserStats(): Promise<MmgUserStats> {
  const response = await connection.get<MmgUserStats>(`${MMG_API}/totals`);
  if (!response.ok) {
    throw new Error("Error al obtener las estadísticas de los usuarios MMG");
  }
  return response.data as MmgUserStats;
}

// Obtener usuarios activos usando findAll y filtrando por membresía activa
export async function getActiveUsers(): Promise<User[]> {
  try {
    let activeUsers: User[] = []; // ← Solo guardar activos, no todos
    let currentPage = 1;
    let totalPages = 1;
    const pageSize = 500; // Tamaño de página razonable
    let processedUsers = 0;

    // Función para verificar si un usuario es activo
    const isActiveUser = (user: User): boolean => {
      if (!user.lastMembership?.membershipId) return false;

      // Normalizar el tipo de membresía para manejar ambos formatos
      if (!user.lastMembership.type) {
        return false; // Sin tipo de membresía no es activo
      }

      const normalizedType = user.lastMembership.type.toLowerCase();
      const currentDate = new Date();

      switch (normalizedType) {
        case "mensual":
        case "monthly": {
          const membershipDate = new Date(user.lastMembership.membershipDate);
          const expirationDate = addMonths(membershipDate, 1);
          return expirationDate >= currentDate;
        }
        case "anual":
        case "yearly": {
          const membershipDate = new Date(user.lastMembership.membershipDate);
          const expirationDate = addYears(membershipDate, 1);
          return expirationDate >= currentDate;
        }
        case "free":
          return true; // Free siempre es activo
        default:
          return false;
      }
    };

    // Obtener y filtrar usuarios página por página
    do {
      const response = await findAll({
        page: currentPage,
        limit: pageSize,
        sortBy: "names",
        sortOrder: "asc",
      });

      // Filtrar SOLO los activos de esta página y agregarlos
      const activeUsersThisPage = response.data.filter(isActiveUser);
      activeUsers = activeUsers.concat(activeUsersThisPage);

      // Actualizar contadores
      processedUsers += response.data.length;
      totalPages = response.metadata.totalPages;
      currentPage++;
    } while (currentPage <= totalPages);

    return activeUsers;
  } catch (error) {
    console.error("Error al obtener usuarios activos:", error);
    throw error;
  }
}

// Obtener usuarios activos usando el endpoint específico /mmg-users/active
export async function getActiveUsersFromEndpoint(
  onProgress?: (progress: {
    loaded: number;
    total: number;
    users: User[];
  }) => void,
  batchSize: number = 1 // Reducir para evitar rate limiting
): Promise<User[]> {
  try {
    let activeUsers: User[] = [];

    // Primero obtener la primera página para conocer el total
    const firstResponse = await connection.get<PaginatedResponse<User>>(
      `${MMG_API}/active`,
      {
        params: {
          page: 1,
          limit: 50, // Reducir límite para evitar rate limiting
        },
      }
    );

    if (!firstResponse.ok) {
      throw new Error(`HTTP error! status: ${firstResponse.status}`);
    }

    // Agregar usuarios de la primera página
    activeUsers = [...firstResponse.data.data];
    const totalPages = firstResponse.data.metadata.totalPages;
    const totalUsers = firstResponse.data.metadata.total;

    // Notificar progreso inicial
    if (onProgress) {
      onProgress({
        loaded: activeUsers.length,
        total: totalUsers,
        users: [...activeUsers],
      });
    }

    // Procesar páginas restantes en lotes paralelos más grandes
    const remainingPages = Array.from(
      { length: totalPages - 1 },
      (_, i) => i + 2
    );

    // Usar chunks más grandes para menos iteraciones
    for (let i = 0; i < remainingPages.length; i += batchSize) {
      const batch = remainingPages.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(remainingPages.length / batchSize);

      // Procesar páginas del lote en paralelo con límite aumentado
      const batchPromises = batch.map((page) =>
        connection.get<PaginatedResponse<User>>(`${MMG_API}/active`, {
          params: {
            page,
            limit: 50, // Reducir límite para evitar rate limiting
          },
        })
      );

      try {
        const batchResponses = await Promise.all(batchPromises);

        // Verificar que todas las respuestas sean exitosas
        const failedResponses = batchResponses.filter(
          (response) => !response.ok
        );
        if (failedResponses.length > 0) {
          console.warn(
            `⚠️ ${failedResponses.length}/${batch.length} páginas fallaron en lote ${batchNumber}`
          );
        }

        // Agregar usuarios de las páginas exitosas
        const batchUsers = batchResponses
          .filter((response) => response.ok)
          .flatMap((response) => response.data.data);

        activeUsers = [...activeUsers, ...batchUsers];

        // Notificar progreso con información detallada
        if (onProgress) {
          onProgress({
            loaded: activeUsers.length,
            total: totalUsers,
            users: [...activeUsers],
          });
        }

        const progressPercent = Math.round(
          (activeUsers.length / totalUsers) * 100
        );
      } catch (error) {
        console.error(
          `❌ Error en lote ${batchNumber} de páginas ${batch.join(", ")}:`,
          error
        );
        // Continuar con el siguiente lote en caso de error
      }

      // Delay entre batches para evitar rate limiting
      if (i + batchSize < remainingPages.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 segundo de delay
      }
    }

    return activeUsers;
  } catch (error) {
    console.error("Error al obtener usuarios activos desde /active:", error);
    throw error;
  }
}

// Cache para fechas reales de cancelación desde /cancelled
let cancelledUsersCache: Record<string, string> = {};
let cancelledCacheTimestamp = 0;
const CANCELLED_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

// Función para cargar fechas reales desde /cancelled
export async function loadCancelledUsersData(): Promise<void> {
  const now = Date.now();
  if (now - cancelledCacheTimestamp < CANCELLED_CACHE_DURATION) {
    return; // Cache válido
  }

  try {
    let currentPage = 1;
    let totalPages = 1;
    cancelledUsersCache = {};

    do {
      const response = await connection.get<
        PaginatedResponse<CancelledUserData>
      >(`${MMG_API}/cancelled`, {
        params: {
          page: currentPage,
          limit: 100,
        },
      });

      if (response.ok) {
        response.data.data.forEach((item) => {
          const user = item._doc;
          const cancellationDate =
            item.cancellationInfo?.estimatedCancellationDate;
          if (user.email && cancellationDate) {
            cancelledUsersCache[user.email] = cancellationDate;
          }
        });

        totalPages = response.data.metadata.totalPages;
        currentPage++;
      } else {
        break;
      }
    } while (currentPage <= totalPages);

    cancelledCacheTimestamp = now;
  } catch (error) {
    console.error("❌ Error cargando datos de cancelación:", error);
  }
}

// Función para determinar si un usuario está en trial
export function isTrialUser(user: User): boolean {
  const membership = user.lastMembership;
  if (!membership) return false;

  const normalizedType = membership.type?.toLowerCase();

  // Un usuario es trial SOLO cuando el tipo es "trial"
  return normalizedType === "trial";
}

// Función para obtener la fecha REAL de cancelación
export function getRealCancellationDate(user: User): string | null {
  if (!user.email) return null;
  return cancelledUsersCache[user.email] || null;
}

// Función para obtener el tipo de plan para mostrar
export function getDisplayPlanType(user: User): string {
  const membership = user.lastMembership;
  if (!membership?.type) return "Sin plan";

  const normalizedType = membership.type.toLowerCase();

  // Para tipos, normalizar
  switch (normalizedType) {
    case "mensual":
    case "monthly":
      return "Mensual";
    case "anual":
    case "yearly":
      return "Anual";
    case "free":
      return "Free";
    case "trial":
      return "Trial";
    default:
      return membership.type;
  }
}

// Función para obtener la fecha de cancelación del trial (usa fechas reales del /cancelled)
export async function getTrialCancellationDate(
  user: User
): Promise<string | null> {
  if (!isTrialUser(user) || !user.email) return null;

  // Primero intentar obtener fecha real desde /cancelled
  const realDate = getRealCancellationDate(user);
  if (realDate) {
    return realDate;
  }

  // Fallback: usar lógica de +7 días si no hay fecha real
  const membership = user.lastMembership;
  if (membership?.membershipDate) {
    const membershipDate = new Date(membership.membershipDate);
    const trialDurationMs = 7 * 24 * 60 * 60 * 1000; // 7 días
    const trialEndDate = new Date(membershipDate.getTime() + trialDurationMs);
    return trialEndDate.toISOString();
  }

  return null;
}

// Función para obtener usuarios en trial desde /active
export async function getTrialUsersFromActive(
  onProgress?: (progress: {
    loaded: number;
    total: number;
    users: User[];
  }) => void
): Promise<User[]> {
  try {
    // Cargar datos de cancelación primero
    await loadCancelledUsersData();

    let allTrialUsers: User[] = [];
    let currentPage = 1;
    let totalPages = 1;

    do {
      const response = await connection.get<PaginatedResponse<User>>(
        `${MMG_API}/active`,
        {
          params: {
            page: currentPage,
            limit: 100,
          },
        }
      );

      if (response.ok) {
        const trialUsersThisPage = response.data.data.filter(isTrialUser);
        allTrialUsers = [...allTrialUsers, ...trialUsersThisPage];

        totalPages = response.data.metadata.totalPages;
        currentPage++;

        if (onProgress) {
          onProgress({
            loaded: allTrialUsers.length,
            total: response.data.metadata.total,
            users: [...allTrialUsers],
          });
        }
      } else {
        break;
      }
    } while (currentPage <= totalPages);

    return allTrialUsers;
  } catch (error) {
    console.error("❌ Error obteniendo usuarios trial:", error);
    throw error;
  }
}

// Nueva función para buscar usuarios activos con paginación y filtros
export async function searchActiveUsers(
  query: FindAllQueryDto
): Promise<PaginatedResponse<User>> {
  try {
    const params: Record<string, string | number | boolean> = {
      page: query.page || 1,
      limit: query.limit || 10,
    };

    if (query.email) params.email = query.email;
    if (query.names) params.names = query.names;
    if (query.lastnames) params.lastnames = query.lastnames;
    if (query.sortBy) params.sortBy = query.sortBy;
    if (query.sortOrder) params.sortOrder = query.sortOrder;

    const response = await connection.get<PaginatedResponse<User>>(
      `${MMG_API}/active`,
      {
        params,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in searchActiveUsers:", error);
    throw error;
  }
}

// Función para cancelar la próxima hipnosis modificando la fecha de membresía
export async function cancelNextHypnosis(userId: string): Promise<User> {
  try {
    // Primero obtener los datos actuales del usuario
    const currentUser = await findOne(userId);
    
    if (!currentUser.lastMembership?.membershipDate) {
      throw new Error('El usuario no tiene fecha de membresía válida');
    }

    // Crear nueva fecha restando un mes
    const currentDate = new Date(currentUser.lastMembership.membershipDate);
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() - 1);
    
    // Mantener el formato ISO con zona horaria
    const newMembershipDate = newDate.toISOString();

    // Actualizar el usuario con la nueva fecha de membresía
    const updateData = {
      features: {
        nextAvailableForm: {
          ...currentUser?.features?.nextAvailableForm,
          enabled: false
        }
      }
    };

    const response = await connection.patch<User>(`${MMG_API}/${userId}`, updateData);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in cancelNextHypnosis:", error);
    throw error;
  }
}
