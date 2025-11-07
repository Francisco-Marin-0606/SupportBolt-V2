import { connection } from "./connectionService";

// Actualizar las interfaces existentes
export interface Membership {
  _id: string;
  userId: string;
  membershipSheetsId?: string;
  membershipType: "monthly" | "yearly" | "free";
  amount: number;
  currency: string;
  processor: string;
  source: string;
  availableAudios: number;
  paymentDate: string;
  billingDate?: string;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface ApiError {
  message: string;
  status: number;
  error?: string;
}

const MMG_API = "/mmg-memberships";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface PaginatedResponse<T> {
  data: T[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// Get all memberships
export async function getMemberships(
  page: number = 1,
  limit: number = 10
): Promise<PaginatedResponse<Membership>> {
  try {
    const response = await connection.get<PaginatedResponse<Membership>>(
      MMG_API,
      {
        params: { page, limit },
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in getMemberships:", error);
    throw error;
  }
}

// Get a single membership by ID
export async function getMembershipById(id: string): Promise<Membership> {
  try {
    const response = await connection.get<Membership>(`${MMG_API}/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in getMembershipById:", error);
    throw error;
  }
}

// Create a new membership
export async function createMembership(
  membershipData: Omit<Membership, "_id">
): Promise<Membership> {
  try {
    const response = await connection.post<Membership>(MMG_API, membershipData);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in createMembership:", error);
    throw error;
  }
}

// Update a membership
export async function updateMembership(
  id: string,
  membershipData: Partial<Membership>
): Promise<Membership> {
  try {
    const response = await connection.patch<Membership>(
      `${MMG_API}/${id}`,
      membershipData
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in updateMembership:", error);
    throw error;
  }
}

// Get memberships by user
export async function getMembershipsByUser(
  userId: string
): Promise<Membership[]> {
  try {
    const response = await connection.get<Membership[]>(
      `${MMG_API}/user/${userId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in getMembershipsByUser:", error);
    throw error;
  }
}

// Update membership status
export async function updateMembershipStatus(
  id: string,
  status: "active" | "expired" | "cancelled"
): Promise<Membership> {
  try {
    const response = await connection.patch<Membership>(
      `${MMG_API}/${id}/status`,
      { status }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in updateMembershipStatus:", error);
    throw error;
  }
}

// Search memberships
export async function searchMemberships(query: string): Promise<Membership[]> {
  try {
    const response = await connection.get<Membership[]>(`${MMG_API}/search`, {
      params: { q: query },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in searchMemberships:", error);
    throw error;
  }
}

// Cancelar suscripción por email (usando connection service)
export async function cancelMembership(body: {
  email?: string;
  cancelAtPeriodEnd?: boolean;
}): Promise<any> {
  try {
    // Enviar el body directamente en las opciones, que se pasará a fetchWithTokenRefresh
    const response = await connection.delete(
      "/mmg-users/cancel-subscription",
      { 
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      } as any
    );

    // Retornar la respuesta completa incluyendo el status
    return {
      ...response,
      statusCode: response.status
    };
  } catch (error) {
    console.error("Error in cancelMembership:", error);
    throw error;
  }
}

// Obtener membresías por userId (usando connection service)
export async function getMembershipsByUserId(
  userId: string
): Promise<Membership[]> {
  try {
    const response = await connection.get<Membership[]>(
      `/mmg-memberships/user/${userId}`
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.data;
  } catch (error) {
    console.error("Error in getMembershipsByUserId:", error);
    throw error;
  }
}

// Crear objeto de servicio simplificado
export const membershipService = {
  cancelMembership,
  getMembershipsByUserId,
};
