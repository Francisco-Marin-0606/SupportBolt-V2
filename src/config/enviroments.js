const getEnvironmentConfig = () => {
    const env = process.env.NODE_ENV || 'development';
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  
    if (!apiUrl) {
      console.warn(`No API URL found for environment: ${env}`);
    }
  
    return {
      environment: env,
      isProduction: env === 'production',
      isTest: env === 'test',
      isDevelopment: env === 'development',
      apiUrl,
    };
  };
  
  export const envConfig = getEnvironmentConfig();