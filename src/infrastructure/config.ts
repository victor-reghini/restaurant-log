import { IRestaurantRepository } from '../domain/repositories/IRestaurantRepository';
import { MockRestaurantRepository } from './mock/MockRestaurantRepository';
import { SupabaseRestaurantRepository } from './supabase/SupabaseRestaurantRepository';
import { LocalApiRestaurantRepository } from './local/LocalApiRestaurantRepository';
import { isSupabaseConfigured } from './supabase/client';

export type AppEnvironment = 'local' | 'production';
export type BackendProvider = 'mock' | 'postgres' | 'supabase';

export const currentEnvironment: AppEnvironment =
  (import.meta.env.VITE_APP_ENV as AppEnvironment) ||
  (import.meta.env.MODE === 'production' ? 'production' : 'local');

const forceMock = import.meta.env.VITE_USE_MOCK === 'true';

export const currentProvider: BackendProvider = forceMock
  ? 'mock'
  : isSupabaseConfigured
  ? 'supabase'
  : 'postgres';

// Singleton instance following Clean Architecture Repository Pattern
export const restaurantRepository: IRestaurantRepository = (() => {
  if (currentProvider === 'supabase') {
    return new SupabaseRestaurantRepository();
  }
  if (currentProvider === 'postgres') {
    return new LocalApiRestaurantRepository();
  }
  return new MockRestaurantRepository();
})();
