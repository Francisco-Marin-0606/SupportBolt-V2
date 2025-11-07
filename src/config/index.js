// src/config/index.js
import { envConfig } from './enviroments';

const config = {
  api: {
    baseUrl: envConfig.apiUrl,
    endpoints: {
      // Auth endpoints
      login: '/auth/login',
      register: '/auth/register',
      forgotPassword: '/auth/forgot-password',
      
      // User endpoints
      users: '/users',
      user: (id) => `/users/${id}`,
      
      // AudioRequest endpoints
      audioRequests: '/audio-requests',
      audioRequest: (id) => `/audio-requests/${id}`,
      audioRequestsByUser: (userId) => `/users/${userId}/audio-requests`,
      audioRequestSuggestions: '/mmg-audio-requests/suggestions',
      
      // Membership endpoints
      memberships: '/memberships',
      membership: (id) => `/memberships/${id}`,
      userMemberships: (userId) => `/users/${userId}/memberships`,
    }
  },
  env: envConfig.environment,
  // Puedes agregar más configuraciones específicas por ambiente
  features: {
    enableAnalytics: envConfig.isProduction,
    enableDebugMode: envConfig.isDevelopment,
    enableTestTools: envConfig.isTest,
  }
};

export const buildApiUrl = (endpoint) => {
  if (!config.api.baseUrl) {
    throw new Error('API URL not configured');
  }
  return `${config.api.baseUrl}${endpoint}`;
};

// Helper para verificar el ambiente actual
export const getCurrentEnvironment = () => envConfig.environment;
export const isTestEnvironment = () => envConfig.isTest;
export const isProductionEnvironment = () => envConfig.isProduction;
export const isDevelopmentEnvironment = () => envConfig.isDevelopment;

export default config;