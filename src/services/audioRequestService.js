import { connection } from '@/app/_services/connectionService';
import config from '@/config';
import httpClient from './httpClient';

/**
 * Servicio para gestionar las operaciones relacionadas con solicitudes de audio
 */
const audioRequestService = {
  /**
   * Obtiene todas las solicitudes de audio
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Array>} - Lista de solicitudes de audio
   */
  getAll: async (options = {}) => {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `${config.api.endpoints.audioRequests}${queryParams ? `?${queryParams}` : ''}`;
    return httpClient.get(endpoint);
  },

  /**
   * Obtiene una solicitud de audio por su ID
   * @param {string} id - ID de la solicitud
   * @returns {Promise<Object>} - Datos de la solicitud de audio
   */
  getById: async (id) => {
    return httpClient.get(config.api.endpoints.audioRequest(id));
  },

  /**
   * Crea una nueva solicitud de audio
   * @param {Object} requestData - Datos de la solicitud a crear
   * @returns {Promise<Object>} - Solicitud creada
   */
  create: async (requestData) => {
    return httpClient.post(config.api.endpoints.audioRequests, requestData);
  },

  /**
   * Actualiza una solicitud de audio existente
   * @param {string} id - ID de la solicitud
   * @param {Object} requestData - Datos actualizados de la solicitud
   * @returns {Promise<Object>} - Solicitud actualizada
   */
  update: async (id, requestData) => {
    return httpClient.put(config.api.endpoints.audioRequest(id), requestData);
  },

  /**
   * Elimina una solicitud de audio
   * @param {string} id - ID de la solicitud a eliminar
   * @returns {Promise<void>}
   */
  delete: async (id) => {
    return httpClient.delete(config.api.endpoints.audioRequest(id));
  },

  /**
   * Obtiene todas las solicitudes de audio de un usuario específico
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Array>} - Lista de solicitudes de audio del usuario
   */
  getByUserId: async (userId, options = {}) => {
    const queryParams = new URLSearchParams(options).toString();
    const endpoint = `${config.api.endpoints.audioRequestsByUser(userId)}${queryParams ? `?${queryParams}` : ''}`;
    return httpClient.get(endpoint);
  },

  /**
   * Cambia el estado de una solicitud de audio
   * @param {string} id - ID de la solicitud
   * @param {string} status - Nuevo estado
   * @returns {Promise<Object>} - Solicitud actualizada
   */
  changeStatus: async (id, status) => {
    return httpClient.put(config.api.endpoints.audioRequest(id), { status });
  },

  /**
   * Envía sugerencias para solicitudes de audio
   * @param {Object} suggestionData - Datos de la sugerencia a enviar
   * @returns {Promise<Object>} - Respuesta del servidor
   */
  sendSuggestions: async (suggestionData) => {
    try {
      const response = await connection.post(
        config.api.endpoints.audioRequestSuggestions,
        suggestionData
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.data;
    } catch (error) {
      console.error('Error in sendSuggestions:', error);
      throw error;
    }
  }
};

export default audioRequestService; 