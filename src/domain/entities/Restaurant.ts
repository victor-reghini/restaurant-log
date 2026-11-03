/**
 * Domain entity: Restaurant
 * Represents a curated restaurant entry with pricing, menu models, and location.
 */

export type PriceTier = '$' | '$$' | '$$$';

export type PricingModel = 'fixed' | 'per_kilo' | 'a_la_carte' | 'mixed';

export type MenuType = 'daily' | 'weekly_fixed' | 'dish_list';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price?: number;
  dayOfWeek?: 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'; // For daily menus
  category?: string; // e.g. "Main Dish", "Sides", "Beverages"
  isHighlight?: boolean;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  category: string; // e.g., 'brasileira', 'buffet', 'italiana', 'japonesa', 'vegetariana'
  address: string;
  coordinates: Coordinates;
  priceTier: PriceTier;
  pricingModel: PricingModel;
  pricingNote?: string; // e.g., "Buffet Livre R$ 39,90" or "R$ 74,90/kg"
  menuType: MenuType;
  menuItems: MenuItem[];
  openingHours: string; // e.g., "Seg - Sex: 11:30 - 15:00"
  rating: number; // 0.0 to 5.0
  reviewCount: number;
  imageUrl: string;
  distanceKm?: number; // Calculated dynamically from user location
  isVerified: boolean; // True once approved by moderator
  createdAt: string;
  updatedAt: string;
}

