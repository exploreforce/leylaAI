import { useState, useCallback, useEffect } from 'react';
import { LoadingState } from '@/types';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useApi<T = any>(options: UseApiOptions = {}) {
  const [state, setState] = useState<LoadingState & { data?: T }>({
    isLoading: false,
    error: undefined,
    data: undefined,
  });

  const execute = useCallback(async (apiCall: () => Promise<T>) => {
    setState(prev => ({ ...prev, isLoading: true, error: undefined }));
    
    try {
      const data = await apiCall();
      setState({ isLoading: false, error: undefined, data });
      options.onSuccess?.(data);
      return data;
    } catch (error: any) {
      const errorMessage = error?.error?.message || error?.message || 'An unexpected error occurred';
      setState({ isLoading: false, error: errorMessage, data: undefined });
      options.onError?.(error);
      throw error;
    }
  }, [options]);

  const reset = useCallback(() => {
    setState({ isLoading: false, error: undefined, data: undefined });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

// Specialized hook for fetching data on mount
export function useFetch<T = any>(
  apiCall: () => Promise<T>,
  dependencies: any[] = [],
  options: UseApiOptions = {}
) {
  const api = useApi<T>(options);

  const fetch = useCallback(() => {
    api.execute(apiCall);
  }, [api, apiCall]);

  // Auto-fetch on mount and dependency changes
  useEffect(() => {
    fetch();
  }, dependencies);

  return {
    ...api,
    refetch: fetch,
  };
} 