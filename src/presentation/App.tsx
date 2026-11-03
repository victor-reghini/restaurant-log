import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { RestaurantCard } from './components/RestaurantCard';
import { RestaurantModal } from './components/RestaurantModal';
import { SuggestionModal } from './components/SuggestionModal';
import { useRestaurants, UseRestaurantsFilters } from '../application/useRestaurants';
import { useFavorites } from '../application/useFavorites';
import { useGeolocation } from '../application/useGeolocation';
import { Restaurant } from '../domain/entities/Restaurant';
import { Utensils, Compass, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

export const App: React.FC = () => {
  // Geolocation
  const {
    coordinates,
    loading: loadingGeo,
    isPermissionGranted,
    requestLocation,
    useDefaultLocation,
  } = useGeolocation();

  // Filters State
  const [filters, setFilters] = useState<UseRestaurantsFilters>({
    category: 'all',
    priceTier: 'all',
    pricingModel: 'all',
    searchQuery: '',
    favoritesOnly: false,
  });

  // Data hooks
  const { restaurants, loading, error, refetch } = useRestaurants(filters, coordinates);
  const { isFavorite, toggleFavorite, favoriteIds } = useFavorites();

  // Modal states
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [isSuggestionOpen, setIsSuggestionOpen] = useState(false);
  const [suggestionTarget, setSuggestionTarget] = useState<Restaurant | null>(null);

  // Extract unique categories
  const categories = useMemo(() => {
    const set = new Set<string>();
    restaurants.forEach((r) => set.add(r.category));
    // Default categories if list is empty
    if (set.size === 0) {
      return ['brasileira', 'vegetariana', 'pizza', 'hamburguer', 'buffet'];
    }
    return Array.from(set);
  }, [restaurants]);

  const handleOpenNewSuggestion = () => {
    setSuggestionTarget(null);
    setIsSuggestionOpen(true);
  };

  const handleOpenUpdateSuggestion = (restaurant: Restaurant) => {
    setSuggestionTarget(restaurant);
    setSelectedRestaurant(null);
    setIsSuggestionOpen(true);
  };

  const handleToggleLocation = () => {
    if (coordinates) {
      // Toggle off by setting coordinates to null
      window.location.reload(); // Simple refresh to clear memory coordinates
    } else {
      requestLocation();
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col font-sans">
      {/* Navigation Header */}
      <Header
        onOpenSuggestion={handleOpenNewSuggestion}
        favoritesCount={favoriteIds.length}
        showFavoritesOnly={filters.favoritesOnly}
        onToggleFavoritesOnly={() =>
          setFilters((prev) => ({ ...prev, favoritesOnly: !prev.favoritesOnly }))
        }
        isLocationActive={Boolean(coordinates)}
        onToggleLocation={handleToggleLocation}
      />

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
        {/* Geolocation Banner / Notice */}
        {!coordinates && !loadingGeo && !isPermissionGranted && (
          <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-orange-600 text-white shrink-0 shadow-xs">
                <Compass className="w-5 h-5 animate-spin-slow" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-stone-900">Encontre restaurantes perto de você</h4>
                <p className="text-xs text-stone-600">
                  Ative a localização para ver a distância exata até cada cardápio e buffet.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={useDefaultLocation}
                className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 shadow-xs"
              >
                Simular SP (Paulista)
              </button>
              <button
                type="button"
                onClick={requestLocation}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 shadow-xs"
              >
                Usar Meu GPS
              </button>
            </div>
          </div>
        )}

        {/* Filter & Search Bar */}
        <FilterBar
          filters={filters}
          onChange={setFilters}
          categories={categories}
        />

        {/* Status / Count indicator */}
        <div className="flex items-center justify-between mb-4 text-xs text-stone-500 font-medium px-1">
          <div className="flex items-center gap-2">
            <span>
              {restaurants.length} {restaurants.length === 1 ? 'restaurante encontrado' : 'restaurantes encontrados'}
            </span>
            {filters.favoritesOnly && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[10px]">
                Filtrando apenas favoritos
              </span>
            )}
            {coordinates && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                Ordenado por proximidade
              </span>
            )}
          </div>

          <button
            onClick={refetch}
            className="hover:text-orange-600 transition-colors inline-flex items-center gap-1"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 mb-6">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white rounded-2xl border border-stone-200 h-80 p-4 space-y-3">
                <div className="bg-stone-200 h-44 rounded-xl w-full" />
                <div className="bg-stone-200 h-4 rounded w-3/4" />
                <div className="bg-stone-200 h-3 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        {/* Restaurant Cards Grid */}
        {!loading && restaurants.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                isFavorite={isFavorite(restaurant.id)}
                onToggleFavorite={toggleFavorite}
                onClick={setSelectedRestaurant}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && restaurants.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-stone-200 p-8 shadow-xs max-w-lg mx-auto">
            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Utensils className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">Nenhum restaurante encontrado</h3>
            <p className="text-xs text-stone-500 mb-6 leading-relaxed">
              Tente alterar os filtros de busca ou cadastre uma nova sugestão para enriquecer a curadoria.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() =>
                  setFilters({
                    category: 'all',
                    priceTier: 'all',
                    pricingModel: 'all',
                    searchQuery: '',
                    favoritesOnly: false,
                  })
                }
                className="px-4 py-2 text-xs font-semibold text-stone-700 bg-stone-100 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Limpar todos os filtros
              </button>
              <button
                onClick={handleOpenNewSuggestion}
                className="px-4 py-2 text-xs font-bold text-white bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors shadow-xs inline-flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Sugerir este Restaurante
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-200 bg-white py-6 text-center text-xs text-stone-400">
        <p>RestôLog • Curadoria e Diário de Restaurantes • Clean Architecture & SOLID</p>
      </footer>

      {/* Modals */}
      <RestaurantModal
        restaurant={selectedRestaurant}
        onClose={() => setSelectedRestaurant(null)}
        isFavorite={selectedRestaurant ? isFavorite(selectedRestaurant.id) : false}
        onToggleFavorite={toggleFavorite}
        onSuggestUpdate={handleOpenUpdateSuggestion}
        onReviewAdded={refetch}
      />

      <SuggestionModal
        isOpen={isSuggestionOpen}
        onClose={() => setIsSuggestionOpen(false)}
        targetRestaurant={suggestionTarget}
        onSuccess={refetch}
      />
    </div>
  );
};

