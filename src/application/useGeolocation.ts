import { useState, useEffect, useCallback } from 'react';
import { Coordinates } from '../domain/entities/Restaurant';

// Default central landmark (São Paulo - Av. Paulista)
const DEFAULT_COORDINATES: Coordinates = {
  latitude: -23.5615,
  longitude: -46.6559,
};

export interface GeolocationState {
  coordinates: Coordinates | null;
  loading: boolean;
  error: string | null;
  isPermissionGranted: boolean;
  requestLocation: () => void;
  useDefaultLocation: () => void;
}

export function useGeolocation(): GeolocationState {
  const [coordinates, setCoordinates] = useState<Coordinates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPermissionGranted, setIsPermissionGranted] = useState(false);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocalização não é suportada pelo seu navegador.');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoordinates({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setIsPermissionGranted(true);
        setLoading(false);
      },
      (err) => {
        let msg = 'Erro ao obter localização.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Permissão de localização negada.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Localização indisponível no momento.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Tempo limite excedido ao buscar localização.';
        }
        setError(msg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const useDefaultLocation = useCallback(() => {
    setCoordinates(DEFAULT_COORDINATES);
    setError(null);
    setIsPermissionGranted(true);
  }, []);

  useEffect(() => {
    // Check permission status if API is available
    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((status) => {
        if (status.state === 'granted') {
          requestLocation();
        }
      });
    }
  }, [requestLocation]);

  return {
    coordinates,
    loading,
    error,
    isPermissionGranted,
    requestLocation,
    useDefaultLocation,
  };
}

