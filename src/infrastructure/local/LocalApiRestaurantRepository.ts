import { IRestaurantRepository, RestaurantFilterParams } from '../../domain/repositories/IRestaurantRepository';
import { Coordinates, Restaurant } from '../../domain/entities/Restaurant';
import { Review } from '../../domain/entities/Review';
import { Suggestion } from '../../domain/entities/Suggestion';

export class LocalApiRestaurantRepository implements IRestaurantRepository {
  async getRestaurants(filters?: RestaurantFilterParams): Promise<Restaurant[]> {
    const params = new URLSearchParams();
    if (filters?.category) params.set('category', filters.category);
    if (filters?.priceTier) params.set('priceTier', filters.priceTier);
    if (filters?.pricingModel) params.set('pricingModel', filters.pricingModel);
    if (filters?.searchQuery) params.set('searchQuery', filters.searchQuery);
    if (filters?.userCoordinates) {
      params.set('userLat', filters.userCoordinates.latitude.toString());
      params.set('userLon', filters.userCoordinates.longitude.toString());
    }
    if (filters?.maxDistanceKm) params.set('maxDistKm', filters.maxDistanceKm.toString());

    const res = await fetch(`/api/restaurants?${params.toString()}`);
    if (!res.ok) throw new Error(`Failed to fetch restaurants: ${res.statusText}`);
    let data: Restaurant[] = await res.json();

    if (filters?.favoritesOnly) {
      const favorites = await this.getFavoriteIds();
      data = data.filter(r => favorites.includes(r.id));
    }

    return data;
  }

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const res = await fetch(`/api/restaurants/${id}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch restaurant: ${res.statusText}`);
    return res.json();
  }

  async submitSuggestion(suggestion: Omit<Suggestion, 'id' | 'status' | 'createdAt'>): Promise<Suggestion> {
    const res = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(suggestion),
    });
    if (!res.ok) throw new Error(`Failed to submit suggestion: ${res.statusText}`);
    return res.json();
  }

  async getReviews(restaurantId: string): Promise<Review[]> {
    const res = await fetch(`/api/reviews?restaurantId=${restaurantId}`);
    if (!res.ok) throw new Error(`Failed to fetch reviews: ${res.statusText}`);
    return res.json();
  }

  async addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    if (!res.ok) throw new Error(`Failed to add review: ${res.statusText}`);
    return res.json();
  }

  async toggleFavorite(restaurantId: string, isFavorite: boolean): Promise<void> {
    const res = await fetch('/api/favorites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId, isFavorite }),
    });
    if (!res.ok) throw new Error(`Failed to toggle favorite: ${res.statusText}`);
  }

  async getFavoriteIds(): Promise<string[]> {
    try {
      const res = await fetch('/api/favorites');
      if (!res.ok) return [];
      return await res.json();
    } catch {
      return [];
    }
  }

  async findDuplicates(name: string, coordinates?: Coordinates): Promise<Restaurant[]> {
    const params = new URLSearchParams({ name });
    if (coordinates) {
      params.set('lat', coordinates.latitude.toString());
      params.set('lon', coordinates.longitude.toString());
    }

    const res = await fetch(`/api/duplicates?${params.toString()}`);
    if (!res.ok) return [];
    return res.json();
  }
}

