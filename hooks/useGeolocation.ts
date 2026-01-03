'use client';

import { useState, useEffect, useCallback } from 'react';

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: GeolocationPositionError | null;
  loading: boolean;
  supported: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  watch?: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const {
    enableHighAccuracy = true,
    timeout = 10000,
    maximumAge = 0,
    watch = false,
  } = options;

  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: false,
    supported: typeof navigator !== 'undefined' && 'geolocation' in navigator,
  });

  const updatePosition = useCallback(
    (position: GeolocationPosition) => {
      setState({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        error: null,
        loading: false,
        supported: true,
      });
    },
    []
  );

  const handleError = useCallback((error: GeolocationPositionError) => {
    setState((prev) => ({
      ...prev,
      error: error,
      loading: false,
    }));
  }, []);

  const getCurrentPosition = useCallback(() => {
    if (!state.supported) {
      setState((prev) => ({
        ...prev,
        error: {
          code: 0,
          message: 'Geolocalización no soportada en este navegador',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as GeolocationPositionError,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      updatePosition,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [state.supported, enableHighAccuracy, timeout, maximumAge, updatePosition, handleError]);

  useEffect(() => {
    if (!state.supported || !watch) return;

    const watchId = navigator.geolocation.watchPosition(
      updatePosition,
      handleError,
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watch, state.supported, enableHighAccuracy, timeout, maximumAge, updatePosition, handleError]);

  return {
    ...state,
    getCurrentPosition,
  };
}

