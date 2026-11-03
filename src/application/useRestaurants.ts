import { useState, useEffect, useCallback } from 'react';
import { Restaurant, Coordinates } from '../domain/entities/Restaurant';
import { restaurantRepository } from '../infrastructure/config';

export interface UseRestaurantsFilters {
  category: string;
  priceTier: string;
  pricingModel: string;
  searchQuery: string;
  favoritesOnly: boolean;
  maxDistanceKm?: number;
}

export function useRestaurants(filters: UseRestaurantsFilters, userCoordinates: Coordinates | null) {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await restaurantRepository.getRestaurants({
        category: filters.category,
        priceTier: filters.priceTier,
        pricingModel: filters.pricingModel,
        searchQuery: filters.searchQuery,
        favoritesOnly: filters.favoritesOnly,
        userCoordinates: userCoordinates || undefined,
        maxDistanceKm: filters.maxDistanceKm,
      });
      setRestaurants(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar restaurantes.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [filters, userCoordinates]);

  useEffect(() => {
    fetchRestaurants();
  }, [fetchRestaurants]);

  return {
    restaurants,
    loading,
    error,
    refetch: fetchRestaurants,
  };
}

