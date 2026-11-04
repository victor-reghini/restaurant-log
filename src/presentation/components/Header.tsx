import React from 'react';
import { UtensilsCrossed, PlusCircle, Heart, MapPin, Database } from 'lucide-react';
import { currentProvider, currentEnvironment } from '../../infrastructure/config';

interface HeaderProps {
  onOpenSuggestion: () => void;
  favoritesCount: number;
  showFavoritesOnly: boolean;
  onToggleFavoritesOnly: () => void;
  isLocationActive: boolean;
  onToggleLocation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSuggestion,
  favoritesCount,
  showFavoritesOnly,
  onToggleFavoritesOnly,
  isLocationActive,
  onToggleLocation,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-stone-900">RestôLog</span>
                <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide ${
                  currentEnvironment === 'production'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {currentEnvironment}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                  <Database className="w-3 h-3 text-stone-500" />
                  {currentProvider === 'supabase' ? 'Supabase' : 'Modo Mock'}
                </span>
              </div>
              <p className="text-xs text-stone-500 hidden sm:block">Curadoria de cardápios, buffets e favoritos</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Proximity GPS button */}
            <button
              onClick={onToggleLocation}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                isLocationActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
              title="Filtrar por restaurantes próximos da sua localização"
            >
              <MapPin className={`w-4 h-4 ${isLocationActive ? 'text-emerald-600 animate-pulse' : 'text-stone-500'}`} />
              <span className="hidden md:inline">{isLocationActive ? 'Localização Ativa' : 'Perto de Mim'}</span>
            </button>

            {/* Favorites filter toggle */}
            <button
              onClick={onToggleFavoritesOnly}
              type="button"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                showFavoritesOnly
                  ? 'bg-rose-50 text-rose-700 border-rose-300 shadow-sm'
                  : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${showFavoritesOnly ? 'fill-rose-500 text-rose-500' : 'text-stone-500'}`} />
              <span>Favoritos</span>
              {favoritesCount > 0 && (
                <span className="ml-0.5 text-xs px-1.5 py-0.2 bg-stone-200 rounded-full font-bold">
                  {favoritesCount}
                </span>
              )}
            </button>

            {/* Suggest restaurant button */}
            <button
              onClick={onOpenSuggestion}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-orange-600 text-white hover:bg-orange-700 transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Sugerir Restaurante</span>
              <span className="sm:hidden">Sugerir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

