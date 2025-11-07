import { User } from "../types/user";
import { Connection } from "./connectionService";

const connection = new Connection();
const USERS_API = "/users";
// Create a new user
export async function createUser(userData: Omit<User, "id">): Promise<User> {
  try {
    const response = await connection.post<User>(USERS_API, userData);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in createUser:", error);
    throw error;
  }
}

// Get all users
export async function findAll(
  params: {
    page?: number;
    limit?: number;
    names?: string;
    email?: string;
    lastnames?: string;
  } = {}
): Promise<{
  data: User[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}> {
  try {
    const response = await connection.get<{
      data: User[];
      metadata: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      };
    }>(USERS_API, { params });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in findAll:", error);
    throw error;
  }
}

// Get user by ID
export async function findOne(id: string): Promise<User> {
  try {
    const response = await connection.get<User>(`${USERS_API}/${id}`);

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
  id: string,
  data: { email: string }
): Promise<User> {
  try {
    const response = await connection.patch<User>(
      `${USERS_API}/${id}/email`,
      data
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

// Get all users
export async function getUsers(): Promise<User[]> {
  try {
    const response = await connection.get<User[]>(USERS_API);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getUsers:", error);
    throw error;
  }
}

// Get a single user by ID
export async function getUserById(id: string): Promise<User> {
  try {
    const response = await connection.get<User>(`${USERS_API}/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getUserById:", error);
    throw error;
  }
}

// Update a user
export async function updateUser(
  id: string,
  userData: Partial<User>
): Promise<User> {
  try {
    const response = await connection.patch<User>(
      `${USERS_API}/${id}`,
      userData
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in updateUser:", error);
    throw error;
  }
}

// Delete a user
export async function deleteUser(id: string): Promise<void> {
  try {
    const response = await connection.delete(`/${id}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error("Error in deleteUser:", error);
    throw error;
  }
}

// Get users by role
export async function getUsersByRole(role: string): Promise<User[]> {
  try {
    const response = await connection.get<User[]>(`${USERS_API}/role/${role}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getUsersByRole:", error);
    throw error;
  }
}

// Update user status
export async function updateUserStatus(
  id: string,
  status: User["status"]
): Promise<User> {
  try {
    const response = await connection.patch<User>(`${USERS_API}/${id}/status`, {
      status,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in updateUserStatus:", error);
    throw error;
  }
}

// Search users
export async function searchUsers(query: string): Promise<User[]> {
  try {
    const response = await connection.get<User[]>(`${USERS_API}/search`, {
      params: { q: query },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in searchUsers:", error);
    throw error;
  }
}

// Get users with pagination
export async function getUsersWithPagination(
  page: number,
  limit: number
): Promise<{
  users: User[];
  total: number;
  totalPages: number;
}> {
  try {
    const response = await connection.get<{
      users: User[];
      total: number;
      totalPages: number;
    }>(USERS_API, { params: { page, limit } });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.data;
  } catch (error) {
    console.error("Error in getUsersWithPagination:", error);
    throw error;
  }
}
