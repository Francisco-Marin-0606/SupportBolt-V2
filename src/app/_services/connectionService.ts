/**
 * Connection class that encapsulates server communication logic
 * using the fetchWithTokenRefresh method to automatically handle
 * token renewal and errors.
 * 
 * Features:
 * - Automatic authentication token handling
 * - Support for query parameters
 * - Automatic JSON/text response processing
 * - File upload support
 * - Request cancellation
 * - Enhanced error handling
 */

import { fetchWithTokenRefresh} from './tokenService';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  withAuth?: boolean;
  timeout?: number; // Maximum wait time in ms
  retries?: number; // Number of retries in case of failure
  retryDelay?: number; // Time between retries in ms
}

interface ResponseData<T> {
  data: T;
  status: number;
  ok: boolean;
  headers: Headers;
  error?: Error;
  requestId?: string;
}

export class Connection {
  private baseUrl: string;
  private abortControllers: Map<string, AbortController> = new Map();

  /**
   * Generates a unique ID for each request
   * @returns Unique ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Connection class constructor
   * @param baseUrl Base URL for all requests
   */
  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Private method to build the complete URL with query parameters
   * @param endpoint API endpoint
   * @param params Query parameters (optional)
   * @returns Complete URL with parameters
   */
  private buildUrl(endpoint: string, params?: Record<string, string | number | boolean>): string {
    // Make sure the endpoint starts with /
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = new URL(`${this.baseUrl}${normalizedEndpoint}`);
    
    // Add query parameters if they exist
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    return url.toString();
  }

  /**
   * Method to cancel an ongoing request
   * @param requestId ID of the request to cancel
   * @returns true if the request was canceled, false if it didn't exist
   */
  cancelRequest(requestId: string): boolean {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
      return true;
    }
    return false;
  }

  /**
   * Method to cancel all ongoing requests
   */
  cancelAllRequests(): void {
    this.abortControllers.forEach((controller) => {
      controller.abort();
    });
    this.abortControllers.clear();
  }

  /**
   * Private method to process the response and convert it to JSON or text
   * @param response Fetch response
   * @returns Processed data with response metadata
   */
  private async processResponse<T>(response: Response): Promise<ResponseData<T>> {
    let data: T;
    
    // Try to process as JSON, if it fails return as text
    try {
      if (response.headers.get('content-type')?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as unknown as T;
      }
    } catch (error) {
      throw new Error(`Error processing response: ${error}`);
    }
    
    return {
      data,
      status: response.status,
      ok: response.ok,
      headers: response.headers
    };
  }

  /**
   * Method to make HTTP GET requests
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Processed response
   */
  async get<T>(endpoint: string, options: RequestOptions = {}): Promise<ResponseData<T>> {
    const { params, withAuth = true, timeout, retries = 0, retryDelay = 1000, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const requestId = this.generateRequestId();
    
    // Create an AbortController for this request
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    // Configure timeout if specified
    let timeoutId: NodeJS.Timeout | null = null;
    if (timeout) {
      timeoutId = setTimeout(() => {
        controller.abort();
        this.abortControllers.delete(requestId);
      }, timeout);
    }
    
    try {
      let lastError: Error | null = null;
      let attempts = 0;
      
      // Try the request with retries if specified
      while (attempts <= retries) {
        try {
          const response = await fetchWithTokenRefresh(url, {
            method: 'GET',
            signal: controller.signal,
            ...fetchOptions
          });
           
          // Clear the timeout if configured
          if (timeoutId) clearTimeout(timeoutId);
          // Remove the controller from the map
          this.abortControllers.delete(requestId);
          
          return {
            ...(await this.processResponse<T>(response)),
            requestId
          };
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          // If there are no more retries or the request was canceled, throw the error
          if (attempts > retries || error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }
          
          // Wait before the next retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      throw lastError;
    } catch (error) {
      // Clear the timeout if configured
      if (timeoutId) clearTimeout(timeoutId);
      // Remove the controller from the map
      this.abortControllers.delete(requestId);
      
      return {
        data: null as unknown as T,
        status: 0,
        ok: false,
        headers: new Headers(),
        error: error as Error,
        requestId
      };
    }
  }

  /**
   * Method to make HTTP POST requests
   * @param endpoint API endpoint
   * @param body Request body
   * @param options Request options
   * @returns Processed response
   */
  async post<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ResponseData<T>> {
    const { params, withAuth = true, timeout, retries = 0, retryDelay = 1000, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const requestId = this.generateRequestId();
    
    // Create an AbortController for this request
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    // Configure timeout if specified
    let timeoutId: NodeJS.Timeout | null = null;
    if (timeout) {
      timeoutId = setTimeout(() => {
        controller.abort();
        this.abortControllers.delete(requestId);
      }, timeout);
    }
    
    try {
      let lastError: Error | null = null;
      let attempts = 0;
      
      // Try the request with retries if specified
      while (attempts <= retries) {
        try {
          const response = await fetchWithTokenRefresh(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...fetchOptions.headers
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
            ...fetchOptions
          });
          
          // Clear the timeout if configured
          if (timeoutId) clearTimeout(timeoutId);
          // Remove the controller from the map
          this.abortControllers.delete(requestId);
          
          return {
            ...(await this.processResponse<T>(response)),
            requestId
          };
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          // If there are no more retries or the request was canceled, throw the error
          if (attempts > retries || error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }
          
          // Wait before the next retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      throw lastError;
    } catch (error) {
      // Clear the timeout if configured
      if (timeoutId) clearTimeout(timeoutId);
      // Remove the controller from the map
      this.abortControllers.delete(requestId);
      
      return {
        data: null as unknown as T,
        status: 0,
        ok: false,
        headers: new Headers(),
        error: error as Error,
        requestId
      };
    }
  }

  /**
   * Method to make HTTP PATCH requests
   * @param endpoint API endpoint
   * @param body Request body
   * @param options Request options
   * @returns Processed response
   */
  async patch<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ResponseData<T>> {
    const { params, withAuth = true, timeout, retries = 0, retryDelay = 1000, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const requestId = this.generateRequestId();
    
    // Create an AbortController for this request
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    // Configure timeout if specified
    let timeoutId: NodeJS.Timeout | null = null;
    if (timeout) {
      timeoutId = setTimeout(() => {
        controller.abort();
        this.abortControllers.delete(requestId);
      }, timeout);
    }
    
    try {
      let lastError: Error | null = null;
      let attempts = 0;
      
      // Try the request with retries if specified
      while (attempts <= retries) {
        try {
          const response = await fetchWithTokenRefresh(url, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              ...fetchOptions.headers
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
            ...fetchOptions
          });
          
          // Clear the timeout if configured
          if (timeoutId) clearTimeout(timeoutId);
          // Remove the controller from the map
          this.abortControllers.delete(requestId);
          
          return {
            ...(await this.processResponse<T>(response)),
            requestId
          };
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          // If there are no more retries or the request was canceled, throw the error
          if (attempts > retries || error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }
          
          // Wait before the next retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      throw lastError;
    } catch (error) {
      // Clear the timeout if configured
      if (timeoutId) clearTimeout(timeoutId);
      // Remove the controller from the map
      this.abortControllers.delete(requestId);
      
      return {
        data: null as unknown as T,
        status: 0,
        ok: false,
        headers: new Headers(),
        error: error as Error,
        requestId
      };
    }
  }

  /**
   * Method to make HTTP PUT requests
   * @param endpoint API endpoint
   * @param body Request body
   * @param options Request options
   * @returns Processed response
   */
  async put<T>(endpoint: string, body?: any, options: RequestOptions = {}): Promise<ResponseData<T>> {
    const { params, withAuth = true, timeout, retries = 0, retryDelay = 1000, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const requestId = this.generateRequestId();
    
    // Create an AbortController for this request
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    // Configure timeout if specified
    let timeoutId: NodeJS.Timeout | null = null;
    if (timeout) {
      timeoutId = setTimeout(() => {
        controller.abort();
        this.abortControllers.delete(requestId);
      }, timeout);
    }
    
    try {
      let lastError: Error | null = null;
      let attempts = 0;
      
      // Try the request with retries if specified
      while (attempts <= retries) {
        try {
          const response = await fetchWithTokenRefresh(url, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              ...fetchOptions.headers
            },
            body: body ? JSON.stringify(body) : undefined,
            signal: controller.signal,
            ...fetchOptions
          });
          
          // Clear the timeout if configured
          if (timeoutId) clearTimeout(timeoutId);
          // Remove the controller from the map
          this.abortControllers.delete(requestId);
          
          return {
            ...(await this.processResponse<T>(response)),
            requestId
          };
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          // If there are no more retries or the request was canceled, throw the error
          if (attempts > retries || error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }
          
          // Wait before the next retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      throw lastError;
    } catch (error) {
      // Clear the timeout if configured
      if (timeoutId) clearTimeout(timeoutId);
      // Remove the controller from the map
      this.abortControllers.delete(requestId);
      
      return {
        data: null as unknown as T,
        status: 0,
        ok: false,
        headers: new Headers(),
        error: error as Error,
        requestId
      };
    }
  }

  /**
   * Method to make HTTP DELETE requests
   * @param endpoint API endpoint
   * @param options Request options
   * @returns Processed response
   */
  async delete<T>(endpoint: string, options: RequestOptions = {}): Promise<ResponseData<T>> {
    const { params, withAuth = true, timeout, retries = 0, retryDelay = 1000, ...fetchOptions } = options;
    const url = this.buildUrl(endpoint, params);
    const requestId = this.generateRequestId();
    
    // Create an AbortController for this request
    const controller = new AbortController();
    this.abortControllers.set(requestId, controller);
    
    // Configure timeout if specified
    let timeoutId: NodeJS.Timeout | null = null;
    if (timeout) {
      timeoutId = setTimeout(() => {
        controller.abort();
        this.abortControllers.delete(requestId);
      }, timeout);
    }
    
    try {
      let lastError: Error | null = null;
      let attempts = 0;
      
      // Try the request with retries if specified
      while (attempts <= retries) {
        try {
          const response = await fetchWithTokenRefresh(url, {
            method: 'DELETE',
            signal: controller.signal,
            ...fetchOptions
          });
          
          // Clear the timeout if configured
          if (timeoutId) clearTimeout(timeoutId);
          // Remove the controller from the map
          this.abortControllers.delete(requestId);
          
          return {
            ...(await this.processResponse<T>(response)),
            requestId
          };
        } catch (error) {
          lastError = error as Error;
          attempts++;
          
          // If there are no more retries or the request was canceled, throw the error
          if (attempts > retries || error instanceof DOMException && error.name === 'AbortError') {
            throw error;
          }
          
          // Wait before the next retry
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
      
      throw lastError;
    } catch (error) {
      // Clear the timeout if configured
      if (timeoutId) clearTimeout(timeoutId);
      // Remove the controller from the map
      this.abortControllers.delete(requestId);
      
      return {
        data: null as unknown as T,
        status: 0,
        ok: false,
        headers: new Headers(),
        error: error as Error,
        requestId
      };
    }
  }
  /**
   * Method to handle HTTP errors more robustly
   * @param error Captured error
   * @param status HTTP status code (optional)
   * @returns Formatted error with additional information
   */
  handleError(error: any, status?: number): Error {
    // If it's already an Error instance, add additional information
    if (error instanceof Error) {
      const enhancedError = new Error(error.message);
      enhancedError.name = error.name;
      (enhancedError as any).status = status || 0;
      (enhancedError as any).originalError = error;
      return enhancedError;
    }
    
    // If it's an object, try to extract a message
    if (typeof error === 'object' && error !== null) {
      const message = error.message || error.error || JSON.stringify(error);
      const enhancedError = new Error(message);
      (enhancedError as any).status = status || 0;
      (enhancedError as any).originalError = error;
      return enhancedError;
    }
    
    // If it's a string or other primitive type
    return new Error(String(error));
  }

  /**
   * Method to create a Connection instance with a different base URL
   * @param baseUrl New base URL
   * @returns New Connection instance
   */
  withBaseUrl(baseUrl: string): Connection {
    return new Connection(baseUrl);
  }
  
  /**
   * Method to create a Connection instance with default options
   * @param options Default options for all requests
   * @returns New Connection instance with configured options
   */
  withDefaultOptions(options: RequestOptions): Connection {
    const instance = new Connection(this.baseUrl);
    
    // Override HTTP methods to include default options
    const originalGet = instance.get.bind(instance);
    instance.get = function<T>(endpoint: string, customOptions: RequestOptions = {}) {
      return originalGet<T>(endpoint, { ...options, ...customOptions });
    };
    
    const originalPost = instance.post.bind(instance);
    instance.post = function<T>(endpoint: string, body?: any, customOptions: RequestOptions = {}) {
      return originalPost<T>(endpoint, body, { ...options, ...customOptions });
    };
    
    const originalPut = instance.put.bind(instance);
    instance.put = function<T>(endpoint: string, body?: any, customOptions: RequestOptions = {}) {
      return originalPut<T>(endpoint, body, { ...options, ...customOptions });
    };
    
    const originalPatch = instance.patch.bind(instance);
    instance.patch = function<T>(endpoint: string, body?: any, customOptions: RequestOptions = {}) {
      return originalPatch<T>(endpoint, body, { ...options, ...customOptions });
    };
    
    const originalDelete = instance.delete.bind(instance);
    instance.delete = function<T>(endpoint: string, customOptions: RequestOptions = {}) {
      return originalDelete<T>(endpoint, { ...options, ...customOptions });
    };

    return instance;
  }
}

// Export a default instance for direct use
export const connection = new Connection();