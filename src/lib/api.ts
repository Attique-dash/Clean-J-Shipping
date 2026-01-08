// src/lib/api.ts
import { useNotification } from '@/contexts/NotificationContext';

export const handleApiError = (error: any, notification: ReturnType<typeof useNotification>) => {
  console.error('API Error:', error);
  
  let errorMessage = 'An unexpected error occurred';
  
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
    
    if (error.response.status === 401) {
      // Handle unauthorized (e.g., redirect to login)
      window.location.href = '/login?error=session_expired';
      return;
    }
    
    if (error.response.status === 403) {
      errorMessage = 'You do not have permission to perform this action';
    }
  } else if (error.request) {
    // The request was made but no response was received
    errorMessage = 'No response from server. Please check your connection.';
  } else {
    // Something happened in setting up the request that triggered an Error
    errorMessage = error.message || errorMessage;
  }
  
  notification.addNotification(errorMessage, 'error');
  throw new Error(errorMessage);
};

// Utility for making API calls with error handling
export const apiFetch = async (
  url: string,
  options: RequestInit = {},
  notification: ReturnType<typeof useNotification>
) => {
  try {
    const response = await fetch(`/api${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = new Error(response.statusText);
      // @ts-expect-error - response property added dynamically
      error.response = await response.json().catch(() => ({}));
      throw error;
    }

    return await response.json();
  } catch (error) {
    return handleApiError(error, notification);
  }
};