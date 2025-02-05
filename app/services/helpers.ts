// Constants
export const API_URL = process.env.NEXT_PUBLIC_BE_API_URL

// Types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface RequestOptions {
  method: HttpMethod;
  headers: HeadersInit;
  body?: string;
}

// Helper functions
const getAuthToken = (bot_token=false): string | null => {
  const token = localStorage.getItem("sara_token")
  if(token) {
    return bot_token ? "Bot ZmlaXnksCbjdVhgf_8" : `Bearer ${token}`;
  }
  return null
};

const getHeaders = (bot_token=false): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  const token = getAuthToken(bot_token);
  if (token) {
    headers.Authorization = `${token}`;
  }
  return headers;
};

const handleApiError = async (response: Response): Promise<never> => {
  try {
    const errorData = await response.json();
    
    // Handle authentication errors (401)
    if (response.status === 401) {
      throw new Error('Invalid credentials');
    }

    // Handle other specific error messages
    if (typeof errorData === 'object') {
      if ('detail' in errorData) {
        throw new Error(errorData.detail);
      }
      if ('non_field_errors' in errorData) {
        throw new Error(errorData.non_field_errors[0]);
      }
      const errorMessage = Object.values(errorData).flat().join(', ');
      throw new Error(errorMessage);
    }

    throw new Error(errorData as string || 'An error occurred');
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
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
  params?: Record<string, any>,
  bot_token=false
): Promise<T> {
  const url = createUrl(uri, params);
  const options: RequestOptions = {
    method,
    headers: getHeaders(bot_token),
  };

  if (payload) {
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);
    //const response=await fetch("hrr",{
   // method:GET,
   //headers:Barre-,
   //
   //
   // })

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
export async function apiGetService<T>(uri: string, params?: Record<string, any>, bot_token=false): Promise<T> {
  return apiRequest<T>(uri, 'GET', undefined, params, bot_token);
}

export async function apiPostService<T>(
  uri: string,
  payload: Record<string, any> = {},
  bot_token=false
): Promise<T> {
  return apiRequest<T>(uri, 'POST', payload, undefined, bot_token);
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