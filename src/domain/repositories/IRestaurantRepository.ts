/**
 * Repository interface for Restaurants and Reviews.
 * Abstraction layer decoupling business domain from Supabase/Firebase/Mock.
 */

import { Coordinates, Restaurant } from '../entities/Restaurant';
import { Review } from '../entities/Review';
import { Suggestion } from '../entities/Suggestion';

export interface RestaurantFilterParams {
  category?: string;
  priceTier?: string;
  pricingModel?: string;
  searchQuery?: string;
  userCoordinates?: Coordinates;
  maxDistanceKm?: number;
  favoritesOnly?: boolean;
}

export interface IRestaurantRepository {
  /** Fetch all active restaurants, optionally filtered */
  getRestaurants(filters?: RestaurantFilterParams): Promise<Restaurant[]>;

  /** Fetch a single restaurant by id */
  getRestaurantById(id: string): Promise<Restaurant | null>;

  /** Submit a community suggestion (to prevent indiscriminate creation and duplicates) */
  submitSuggestion(suggestion: Omit<Suggestion, 'id' | 'status' | 'createdAt'>): Promise<Suggestion>;

  /** Fetch reviews for a specific restaurant */
  getReviews(restaurantId: string): Promise<Review[]>;

  /** Add a review with optional photos */
  addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review>;

  /** Toggle favorite status for a restaurant */
  toggleFavorite(restaurantId: string, isFavorite: boolean): Promise<void>;

  /** Get the list of favorite restaurant IDs for the current user */
  getFavoriteIds(): Promise<string[]>;

  /** Check for possible duplicates before submission (name or coordinate proximity) */
  findDuplicates(name: string, coordinates?: Coordinates): Promise<Restaurant[]>;
}

