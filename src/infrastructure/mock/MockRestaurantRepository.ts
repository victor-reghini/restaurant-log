import { IRestaurantRepository, RestaurantFilterParams } from '../../domain/repositories/IRestaurantRepository';
import { Coordinates, Restaurant } from '../../domain/entities/Restaurant';
import { Review } from '../../domain/entities/Review';
import { Suggestion } from '../../domain/entities/Suggestion';
import { INITIAL_RESTAURANTS, INITIAL_REVIEWS } from './mockData';

const FAVORITES_STORAGE_KEY = 'resto_log_favorites';
const RESTAURANTS_STORAGE_KEY = 'resto_log_restaurants';
const REVIEWS_STORAGE_KEY = 'resto_log_reviews';
const SUGGESTIONS_STORAGE_KEY = 'resto_log_suggestions';

/**
 * Calculates Haversine distance in kilometers between two geographic points
 */
export function calculateHaversineDistanceKm(coord1: Coordinates, coord2: Coordinates): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  const dLat = toRad(coord2.latitude - coord1.latitude);
  const dLon = toRad(coord2.longitude - coord1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(coord1.latitude)) * Math.cos(toRad(coord2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Safe storage abstraction (works in browser LocalStorage and Node.js test environment)
class SafeStorage {
  private mem = new Map<string, string>();

  getItem(key: string): string | null {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem(key);
    }
    return this.mem.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    } else {
      this.mem.set(key, value);
    }
  }
}

const storage = new SafeStorage();

export class MockRestaurantRepository implements IRestaurantRepository {
  private getStoredRestaurants(): Restaurant[] {
    const raw = storage.getItem(RESTAURANTS_STORAGE_KEY);
    if (!raw) {
      storage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(INITIAL_RESTAURANTS));
      return INITIAL_RESTAURANTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_RESTAURANTS;
    }
  }

  private saveRestaurants(restaurants: Restaurant[]): void {
    storage.setItem(RESTAURANTS_STORAGE_KEY, JSON.stringify(restaurants));
  }

  private getStoredReviews(): Review[] {
    const raw = storage.getItem(REVIEWS_STORAGE_KEY);
    if (!raw) {
      storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(INITIAL_REVIEWS));
      return INITIAL_REVIEWS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_REVIEWS;
    }
  }

  private saveReviews(reviews: Review[]): void {
    storage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
  }

  async getRestaurants(filters?: RestaurantFilterParams): Promise<Restaurant[]> {
    let list = this.getStoredRestaurants();
    const favoriteIds = await this.getFavoriteIds();

    // Compute proximity if user coordinates provided
    if (filters?.userCoordinates) {
      list = list.map(item => ({
        ...item,
        distanceKm: calculateHaversineDistanceKm(filters.userCoordinates!, item.coordinates)
      }));
    }

    // Filter by favorites
    if (filters?.favoritesOnly) {
      list = list.filter(item => favoriteIds.includes(item.id));
    }

    // Filter by category
    if (filters?.category && filters.category !== 'all') {
      list = list.filter(item => item.category.toLowerCase() === filters.category!.toLowerCase());
    }

    // Filter by price tier
    if (filters?.priceTier && filters.priceTier !== 'all') {
      list = list.filter(item => item.priceTier === filters.priceTier);
    }

    // Filter by pricing model
    if (filters?.pricingModel && filters.pricingModel !== 'all') {
      list = list.filter(item => item.pricingModel === filters.pricingModel);
    }

    // Filter by search query
    if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
      const q = filters.searchQuery.toLowerCase().trim();
      list = list.filter(item =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.address.toLowerCase().includes(q) ||
        item.menuItems.some(m => m.name.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q)))
      );
    }

    // Filter by max distance
    if (filters?.maxDistanceKm && filters.userCoordinates) {
      list = list.filter(item => (item.distanceKm ?? 9999) <= filters.maxDistanceKm!);
    }

    // Sort by distance if location provided, else by rating
    if (filters?.userCoordinates) {
      list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    } else {
      list.sort((a, b) => b.rating - a.rating);
    }

    return list;
  }

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const list = this.getStoredRestaurants();
    return list.find(r => r.id === id) || null;
  }

  async submitSuggestion(suggestion: Omit<Suggestion, 'id' | 'status' | 'createdAt'>): Promise<Suggestion> {
    const raw = storage.getItem(SUGGESTIONS_STORAGE_KEY);
    const suggestions: Suggestion[] = raw ? JSON.parse(raw) : [];

    const newSuggestion: Suggestion = {
      ...suggestion,
      id: `sug-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    suggestions.push(newSuggestion);
    storage.setItem(SUGGESTIONS_STORAGE_KEY, JSON.stringify(suggestions));
    return newSuggestion;
  }

  async getReviews(restaurantId: string): Promise<Review[]> {
    const all = this.getStoredReviews();
    return all
      .filter(r => r.restaurantId === restaurantId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const all = this.getStoredReviews();
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    all.push(newReview);
    this.saveReviews(all);

    // Update restaurant rating
    const restaurants = this.getStoredRestaurants();
    const rest = restaurants.find(r => r.id === reviewData.restaurantId);
    if (rest) {
      const restReviews = all.filter(r => r.restaurantId === rest.id);
      const avg = restReviews.reduce((sum, r) => sum + r.rating, 0) / restReviews.length;
      rest.rating = Number(avg.toFixed(1));
      rest.reviewCount = restReviews.length;
      this.saveRestaurants(restaurants);
    }

    return newReview;
  }

  async toggleFavorite(restaurantId: string, isFavorite: boolean): Promise<void> {
    const current = await this.getFavoriteIds();
    let updated: string[];
    if (isFavorite) {
      updated = Array.from(new Set([...current, restaurantId]));
    } else {
      updated = current.filter(id => id !== restaurantId);
    }
    storage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(updated));
  }

  async getFavoriteIds(): Promise<string[]> {
    const raw = storage.getItem(FAVORITES_STORAGE_KEY);
    if (!raw) return ['rest-1', 'rest-3']; // Default favorites for rich showcase
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  async findDuplicates(name: string, coordinates?: Coordinates): Promise<Restaurant[]> {
    const list = this.getStoredRestaurants();
    const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');

    return list.filter(r => {
      const existingClean = r.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      const nameMatch = existingClean.includes(cleanName) || cleanName.includes(existingClean);

      let closeInDistance = false;
      if (coordinates) {
        const dist = calculateHaversineDistanceKm(coordinates, r.coordinates);
        closeInDistance = dist < 0.2; // Less than 200m
      }

      return nameMatch || closeInDistance;
    });
  }
}

