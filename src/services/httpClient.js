import { buildApiUrl } from '@/config';

/**
 * Cliente HTTP base para realizar peticiones a la API
 */
class HttpClient {
  /**
   * Realiza una petición GET
   * @param {string} endpoint - Endpoint relativo
   * @param {Object} options - Opciones adicionales para fetch
   * @returns {Promise<any>} - Respuesta de la API
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Realiza una petición POST
   * @param {string} endpoint - Endpoint relativo
   * @param {Object} data - Datos a enviar
   * @param {Object} options - Opciones adicionales para fetch
   * @returns {Promise<any>} - Respuesta de la API
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Realiza una petición PUT
   * @param {string} endpoint - Endpoint relativo
   * @param {Object} data - Datos a enviar
   * @param {Object} options - Opciones adicionales para fetch
   * @returns {Promise<any>} - Respuesta de la API
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Realiza una petición DELETE
   * @param {string} endpoint - Endpoint relativo
   * @param {Object} options - Opciones adicionales para fetch
   * @returns {Promise<any>} - Respuesta de la API
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }

  /**
   * Método base para realizar peticiones HTTP
   * @param {string} endpoint - Endpoint relativo
   * @param {Object} options - Opciones para fetch
   * @returns {Promise<any>} - Respuesta procesada
   */
  async request(endpoint, options = {}) {
    const url = buildApiUrl(endpoint);
    
    // Agrega cabeceras por defecto
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // Agrega token de autenticación si está disponible
    let token;
    try {
      token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    } catch {
      token = null;
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Manejar respuestas que no son JSON
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json();
        
        if (!response.ok) {
          // Propagar errores del servidor como excepciones
          throw new Error(data.message || `Error ${response.status}: ${response.statusText}`);
        }
        
        return data;
      } else {
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
        return await response.text();
      }
    } catch (error) {
      console.error(`Error en petición HTTP a ${endpoint}:`, error);
      throw error;
    }
  }
}

// Crear una instancia y exportarla
const httpClient = new HttpClient();
export default httpClient;