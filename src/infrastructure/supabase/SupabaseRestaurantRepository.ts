import { IRestaurantRepository, RestaurantFilterParams } from '../../domain/repositories/IRestaurantRepository';
import { Coordinates, Restaurant } from '../../domain/entities/Restaurant';
import { Review } from '../../domain/entities/Review';
import { Suggestion } from '../../domain/entities/Suggestion';
import { supabase } from './client';

export class SupabaseRestaurantRepository implements IRestaurantRepository {
  private client = supabase!;

  async getRestaurants(filters?: RestaurantFilterParams): Promise<Restaurant[]> {
    if (!this.client) throw new Error('Supabase is not configured');

    // If coordinates are provided, use the PostGIS RPC function for fast spatial query
    if (filters?.userCoordinates) {
      const { data, error } = await this.client.rpc('get_nearby_restaurants', {
        user_lat: filters.userCoordinates.latitude,
        user_lon: filters.userCoordinates.longitude,
        max_dist_km: filters.maxDistanceKm || 50,
      });

      if (error) throw error;
      return (data || []).map(this.mapDbToRestaurant);
    }

    let query = this.client
      .from('restaurants')
      .select('*, menu_items(*)')
      .eq('is_verified', true);

    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }

    if (filters?.priceTier && filters.priceTier !== 'all') {
      query = query.eq('price_tier', filters.priceTier);
    }

    if (filters?.pricingModel && filters.pricingModel !== 'all') {
      query = query.eq('pricing_model', filters.pricingModel);
    }

    if (filters?.searchQuery) {
      query = query.ilike('name', `%${filters.searchQuery}%`);
    }

    const { data, error } = await query.order('rating', { ascending: false });
    if (error) throw error;

    return (data || []).map(this.mapDbToRestaurant);
  }

  async getRestaurantById(id: string): Promise<Restaurant | null> {
    const { data, error } = await this.client
      .from('restaurants')
      .select('*, menu_items(*)')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    return this.mapDbToRestaurant(data);
  }

  async submitSuggestion(suggestion: Omit<Suggestion, 'id' | 'status' | 'createdAt'>): Promise<Suggestion> {
    const { data, error } = await this.client
      .from('restaurant_suggestions')
      .insert({
        type: suggestion.type,
        target_restaurant_id: suggestion.targetRestaurantId,
        data: suggestion.data,
        suggested_by_user_id: suggestion.suggestedBy.userId,
        suggested_by_user_name: suggestion.suggestedBy.userName,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      type: data.type,
      targetRestaurantId: data.target_restaurant_id,
      data: data.data,
      suggestedBy: {
        userId: data.suggested_by_user_id,
        userName: data.suggested_by_user_name,
      },
      status: data.status,
      createdAt: data.created_at,
    };
  }

  async getReviews(restaurantId: string): Promise<Review[]> {
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(r => ({
      id: r.id,
      restaurantId: r.restaurant_id,
      userId: r.user_id,
      userName: r.user_name,
      userAvatar: r.user_avatar,
      rating: r.rating,
      comment: r.comment,
      photoUrls: r.photo_urls || [],
      createdAt: r.created_at,
    }));
  }

  async addReview(review: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const { data, error } = await this.client
      .from('reviews')
      .insert({
        restaurant_id: review.restaurantId,
        user_id: review.userId,
        user_name: review.userName,
        user_avatar: review.userAvatar,
        rating: review.rating,
        comment: review.comment,
        photo_urls: review.photoUrls,
      })
      .select()
      .single();

    if (error) throw error;
    return {
      id: data.id,
      restaurantId: data.restaurant_id,
      userId: data.user_id,
      userName: data.user_name,
      userAvatar: data.user_avatar,
      rating: data.rating,
      comment: data.comment,
      photoUrls: data.photo_urls || [],
      createdAt: data.created_at,
    };
  }

  async toggleFavorite(restaurantId: string, isFavorite: boolean): Promise<void> {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) throw new Error('User not authenticated');

    if (isFavorite) {
      await this.client.from('favorites').upsert({
        user_id: user.id,
        restaurant_id: restaurantId,
      });
    } else {
      await this.client
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId);
    }
  }

  async getFavoriteIds(): Promise<string[]> {
    const user = (await this.client.auth.getUser()).data.user;
    if (!user) return [];

    const { data, error } = await this.client
      .from('favorites')
      .select('restaurant_id')
      .eq('user_id', user.id);

    if (error) return [];
    return (data || []).map(f => f.restaurant_id);
  }

  async findDuplicates(name: string, coordinates?: Coordinates): Promise<Restaurant[]> {
    // Trigram similarity query in PostgreSQL
    const { data, error } = await this.client.rpc('find_duplicate_restaurants', {
      search_name: name,
      search_lat: coordinates?.latitude || null,
      search_lon: coordinates?.longitude || null,
    });

    if (error) return [];
    return (data || []).map(this.mapDbToRestaurant);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapDbToRestaurant(item: any): Restaurant {
    return {
      id: item.id,
      name: item.name,
      description: item.description || '',
      category: item.category,
      address: item.address,
      coordinates: {
        latitude: item.latitude,
        longitude: item.longitude,
      },
      priceTier: item.price_tier,
      pricingModel: item.pricing_model,
      pricingNote: item.pricing_note,
      menuType: item.menu_type,
      menuItems: (item.menu_items || []).map((m: any) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        price: m.price,
        dayOfWeek: m.day_of_week,
        category: m.category,
        isHighlight: m.is_highlight,
      })),
      openingHours: item.opening_hours || '',
      rating: item.rating || 0,
      reviewCount: item.review_count || 0,
      imageUrl: item.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
      distanceKm: item.dist_km ? Number(item.dist_km.toFixed(1)) : undefined,
      isVerified: item.is_verified,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  }
}

