import httpClient from './httpClient';
import config from '@/config';

/**
 * Servicio para gestionar las operaciones relacionadas con usuarios
 */
const userService = {
  /**
   * Obtiene todos los usuarios
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Array>} - Lista de usuarios
   */
  getAll: async (options = {}) => {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `${config.api.endpoints.users}${queryParams ? `?${queryParams}` : ''}`;
    return httpClient.get(endpoint);
  },

  /**
   * Obtiene un usuario por su ID
   * @param {string} id - ID del usuario
   * @returns {Promise<Object>} - Datos del usuario
   */
  getById: async (id) => {
    return httpClient.get(config.api.endpoints.user(id));
  },

  /**
   * Crea un nuevo usuario
   * @param {Object} userData - Datos del usuario a crear
   * @returns {Promise<Object>} - Usuario creado
   */
  create: async (userData) => {
    return httpClient.post(config.api.endpoints.users, userData);
  },

  /**
   * Actualiza un usuario existente
   * @param {string} id - ID del usuario
   * @param {Object} userData - Datos actualizados del usuario
   * @returns {Promise<Object>} - Usuario actualizado
   */
  update: async (id, userData) => {
    return httpClient.put(config.api.endpoints.user(id), userData);
  },

  /**
   * Elimina un usuario
   * @param {string} id - ID del usuario a eliminar
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return httpClient.delete(config.api.endpoints.user(id));
  },

  /**
   * Obtiene el perfil del usuario actual (autenticado)
   * @returns {Promise<Object>} - Perfil del usuario actual
   */
  getCurrentProfile: async () => {
    return httpClient.get(`${config.api.endpoints.users}/me`);
  },

  /**
   * Actualiza el perfil del usuario actual
   * @param {Object} profileData - Datos actualizados del perfil
   * @returns {Promise<Object>} - Perfil actualizado
   */
  updateProfile: async (profileData) => {
    return httpClient.put(`${config.api.endpoints.users}/me`, profileData);
  }
};

export default userService; 