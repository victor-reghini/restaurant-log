import React from 'react';
import { Heart, MapPin, Clock, Tag, ChevronRight } from 'lucide-react';
import { Restaurant } from '../../domain/entities/Restaurant';
import { StarRating } from './StarRating';

interface RestaurantCardProps {
  restaurant: Restaurant;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onClick: (restaurant: Restaurant) => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  isFavorite,
  onToggleFavorite,
  onClick,
}) => {
  // Get today's day of week
  const daysMap: Record<number, 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = {
    0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
  };
  const todayKey = daysMap[new Date().getDay()];

  // Find dish of the day if daily menu
  const todaySpecial = restaurant.menuType === 'daily'
    ? restaurant.menuItems.find(m => m.dayOfWeek === todayKey)
    : restaurant.menuItems.find(m => m.isHighlight);

  const pricingModelLabels: Record<string, string> = {
    fixed: 'Buffet Livre / Preço Fixo',
    per_kilo: 'Por Quilo',
    a_la_carte: 'À la Carte / PF',
    mixed: 'Livre & Balança',
  };

  return (
    <article
      onClick={() => onClick(restaurant)}
      className="group bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
    >
      {/* Image Banner */}
      <div className="relative h-48 w-full bg-stone-100 overflow-hidden">
        <img
          src={restaurant.imageUrl}
          alt={restaurant.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />

        {/* Favorite Button */}
        <button
          type="button"
          aria-label={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(restaurant.id);
          }}
          className="absolute top-3 right-3 p-2 rounded-full bg-white/90 backdrop-blur-sm text-stone-700 hover:text-rose-600 transition-transform active:scale-90 shadow-sm"
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : 'text-stone-600'}`} />
        </button>

        {/* Category & Price Badges */}
        <div className="absolute bottom-3 left-3 flex flex-wrap items-center gap-1.5">
          <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-900/80 backdrop-blur-sm text-white">
            {restaurant.category.toUpperCase()}
          </span>
          <span className="px-2 py-1 rounded-md text-xs font-bold bg-white/90 backdrop-blur-sm text-stone-900">
            {restaurant.priceTier}
          </span>
          {restaurant.distanceKm !== undefined && (
            <span className="px-2 py-1 rounded-md text-xs font-bold bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
              <MapPin className="w-3 h-3" />
              {restaurant.distanceKm} km
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Header & Rating */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="font-bold text-lg text-stone-900 leading-snug group-hover:text-orange-600 transition-colors">
              {restaurant.name}
            </h3>
            <div className="flex items-center gap-1.5 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200/60 shrink-0">
              <StarRating rating={restaurant.rating} size="sm" />
              <span className="text-xs font-bold text-amber-900">{restaurant.rating.toFixed(1)}</span>
            </div>
          </div>

          <p className="text-stone-600 text-xs line-clamp-2 mb-3">
            {restaurant.description}
          </p>

          {/* Pricing Model Badge */}
          <div className="flex items-center gap-1.5 text-xs text-stone-600 font-medium mb-3">
            <Tag className="w-3.5 h-3.5 text-orange-600 shrink-0" />
            <span className="font-semibold text-stone-800">{pricingModelLabels[restaurant.pricingModel] || restaurant.pricingModel}</span>
            {restaurant.pricingNote && (
              <span className="text-stone-500 truncate">({restaurant.pricingNote})</span>
            )}
          </div>

          {/* Special / Dish of the Day Box */}
          {todaySpecial && (
            <div className="bg-orange-50/60 border border-orange-100 rounded-xl p-2.5 mb-3 text-xs">
              <span className="font-bold text-orange-800 block text-[11px] uppercase tracking-wide">
                {restaurant.menuType === 'daily' ? 'Prato de Hoje:' : 'Destaque do Cardápio:'}
              </span>
              <p className="text-stone-800 font-medium mt-0.5 truncate">
                {todaySpecial.name}
              </p>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <div className="flex items-center gap-1 truncate max-w-[80%]">
            <Clock className="w-3.5 h-3.5 shrink-0 text-stone-400" />
            <span className="truncate">{restaurant.openingHours}</span>
          </div>
          <span className="text-orange-600 font-semibold inline-flex items-center group-hover:translate-x-0.5 transition-transform">
            Ver mais <ChevronRight className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </article>
  );
};

