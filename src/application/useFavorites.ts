import { useState, useEffect, useCallback } from 'react';
import { restaurantRepository } from '../infrastructure/config';

export function useFavorites() {
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = useCallback(async () => {
    try {
      const ids = await restaurantRepository.getFavoriteIds();
      setFavoriteIds(ids);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const toggleFavorite = async (restaurantId: string) => {
    const isCurrentlyFavorite = favoriteIds.includes(restaurantId);
    // Optimistic UI update
    setFavoriteIds((prev) =>
      isCurrentlyFavorite ? prev.filter((id) => id !== restaurantId) : [...prev, restaurantId]
    );

    try {
      await restaurantRepository.toggleFavorite(restaurantId, !isCurrentlyFavorite);
    } catch {
      // Rollback on failure
      setFavoriteIds((prev) =>
        isCurrentlyFavorite ? [...prev, restaurantId] : prev.filter((id) => id !== restaurantId)
      );
    }
  };

  const isFavorite = (restaurantId: string) => favoriteIds.includes(restaurantId);

  return {
    favoriteIds,
    loading,
    isFavorite,
    toggleFavorite,
    refreshFavorites: fetchFavorites,
  };
}

