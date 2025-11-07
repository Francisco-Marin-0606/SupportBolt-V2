import httpClient from './httpClient';
import config from '@/config';

/**
 * Servicio para gestionar las operaciones relacionadas con membresías
 */
const membershipService = {
  /**
   * Obtiene todas las membresías
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Array>} - Lista de membresías
   */
  getAll: async (options = {}) => {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `${config.api.endpoints.memberships}${queryParams ? `?${queryParams}` : ''}`;
    return httpClient.get(endpoint);
  },

  /**
   * Obtiene una membresía por su ID
   * @param {string} id - ID de la membresía
   * @returns {Promise<Object>} - Datos de la membresía
   */
  getById: async (id) => {
    return httpClient.get(config.api.endpoints.membership(id));
  },

  /**
   * Crea una nueva membresía
   * @param {Object} membershipData - Datos de la membresía a crear
   * @returns {Promise<Object>} - Membresía creada
   */
  create: async (membershipData) => {
    return httpClient.post(config.api.endpoints.memberships, membershipData);
  },

  /**
   * Actualiza una membresía existente
   * @param {string} id - ID de la membresía
   * @param {Object} membershipData - Datos actualizados de la membresía
   * @returns {Promise<Object>} - Membresía actualizada
   */
  update: async (id, membershipData) => {
    return httpClient.put(config.api.endpoints.membership(id), membershipData);
  },

  /**
   * Elimina una membresía
   * @param {string} id - ID de la membresía a eliminar
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return httpClient.delete(config.api.endpoints.membership(id));
  },

  /**
   * Obtiene todas las membresías de un usuario específico
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Array>} - Lista de membresías del usuario
   */
  getByUserId: async (userId, options = {}) => {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `${config.api.endpoints.userMemberships(userId)}${queryParams ? `?${queryParams}` : ''}`;
    return httpClient.get(endpoint);
  },

  /**
   * Verifica si un usuario tiene una membresía activa
   * @param {string} userId - ID del usuario
   * @returns {Promise<boolean>} - True si tiene membresía activa, false en caso contrario
   */
  hasActiveMembership: async (userId) => {
    try {
      const memberships = await membershipService.getByUserId(userId, { status: 'active' });
      return memberships.length > 0;
    } catch (error) {
      console.error('Error al verificar membresía activa:', error);
      return false;
    }
  },

  /**
   * Activa una membresía
   * @param {string} id - ID de la membresía
   * @returns {Promise<Object>} - Membresía activada
   */
  activate: async (id) => {
    return httpClient.put(config.api.endpoints.membership(id), { status: 'active' });
  },

  /**
   * Cancela una membresía
   * @param {string} id - ID de la membresía
   * @returns {Promise<Object>} - Membresía cancelada
   */
  cancel: async (id) => {
    return httpClient.put(config.api.endpoints.membership(id), { status: 'cancelled' });
  }
};

export default membershipService; 