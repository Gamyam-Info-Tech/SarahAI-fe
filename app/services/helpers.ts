// Constants
export const API_URL = process.env.NODE_ENV === 'production' 
  ? "http://216.48.179.15:8000"
  : "http://localhost:8000";

// Types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

interface RequestOptions {
  method: HttpMethod;
  headers: HeadersInit;
  body?: string;
}

// Helper functions
const getAuthToken = (): string | null => {
  return localStorage.getItem("sara_token");
};

const getHeaders = (): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const handleApiError = async (response: Response): Promise<never> => {
  try {
    const errorData = await response.json();
    let errorMessage: string;

    if (typeof errorData === 'object') {
      errorMessage = Object.values(errorData).flat().join(', ');
    } else {
      errorMessage = errorData as string;
    }

    throw new Error(errorMessage || 'An error occurred');
  } catch (error) {
    throw new Error('An unexpected error occurred');
  }
};

const createUrl = (uri: string, params?: Record<string, any>): string => {
  let url = `${API_URL}${uri}`;
  if (params) {
    const queryString = new URLSearchParams(params).toString();
    url = queryString ? `${url}?${queryString}` : url;
  }
  return url;
};

// Generic API request function
async function apiRequest<T>(
  uri: string,
  method: HttpMethod,
  payload?: any,
  params?: Record<string, any>
): Promise<T> {
  const url = createUrl(uri, params);
  const options: RequestOptions = {
    method,
    headers: getHeaders(),
  };

  if (payload) {
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      await handleApiError(response);
    }

    // Handle CSV response
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/csv')) {
      return response.blob() as unknown as T;
    }

    return response.json();
  } catch (error) {
    console.error(`API ${method} Error:`, error);
    throw error;
  }
}

// Exported service functions
export async function apiGetService<T>(uri: string, params?: Record<string, any>): Promise<T> {
  return apiRequest<T>(uri, 'GET', undefined, params);
}

export async function apiPostService<T>(
  uri: string,
  payload: Record<string, any> = {}
): Promise<T> {
  return apiRequest<T>(uri, 'POST', payload);
}

export async function apiPutService<T>(
  uri: string,
  payload: Record<string, any>
): Promise<T> {
  return apiRequest<T>(uri, 'PUT', payload);
}

export async function apiPatchService<T>(
  uri: string,
  payload: Record<string, any>
): Promise<T> {
  return apiRequest<T>(uri, 'PATCH', payload);
}

export async function apiDeleteService(uri: string): Promise<boolean> {
  await apiRequest(uri, 'DELETE');
  return true;
}