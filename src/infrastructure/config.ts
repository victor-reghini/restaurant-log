import { IRestaurantRepository } from '../domain/repositories/IRestaurantRepository';
import { MockRestaurantRepository } from './mock/MockRestaurantRepository';
import { SupabaseRestaurantRepository } from './supabase/SupabaseRestaurantRepository';
import { isSupabaseConfigured } from './supabase/client';

export type AppEnvironment = 'development' | 'test' | 'production';
export type BackendProvider = 'mock' | 'supabase';

export const currentEnvironment: AppEnvironment =
  (import.meta.env.VITE_APP_ENV as AppEnvironment) ||
  (import.meta.env.MODE === 'production' ? 'production' : 'development');

const forceMock = import.meta.env.VITE_USE_MOCK === 'true';

export const currentProvider: BackendProvider = (isSupabaseConfigured && !forceMock)
  ? 'supabase'
  : 'mock';

// Singleton instance following Clean Architecture Repository Pattern
export const restaurantRepository: IRestaurantRepository =
  currentProvider === 'supabase'
    ? new SupabaseRestaurantRepository()
    : new MockRestaurantRepository();

