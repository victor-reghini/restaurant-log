import React from 'react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { UseRestaurantsFilters } from '../../application/useRestaurants';

interface FilterBarProps {
  filters: UseRestaurantsFilters;
  onChange: (filters: UseRestaurantsFilters) => void;
  categories: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({ filters, onChange, categories }) => {
  const priceTiers = [
    { label: 'Todos', value: 'all' },
    { label: '$ (Econômico)', value: '$' },
    { label: '$$ (Moderado)', value: '$$' },
    { label: '$$$ (Sofisticado)', value: '$$$' },
  ];

  const pricingModels = [
    { label: 'Todos os modelos', value: 'all' },
    { label: 'Por Quilo', value: 'per_kilo' },
    { label: 'Buffet Livre / Fixo', value: 'fixed' },
    { label: 'Pratos Feitos / À la Carte', value: 'a_la_carte' },
    { label: 'Misto', value: 'mixed' },
  ];

  const hasActiveFilters =
    filters.category !== 'all' ||
    filters.priceTier !== 'all' ||
    filters.pricingModel !== 'all' ||
    filters.searchQuery !== '';

  const handleClear = () => {
    onChange({
      ...filters,
      category: 'all',
      priceTier: 'all',
      pricingModel: 'all',
      searchQuery: '',
    });
  };

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
      {/* Search Bar */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={filters.searchQuery}
          onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
          placeholder="Buscar por restaurante, prato (ex: feijoada), endereço ou ingrediente..."
          className="w-full pl-11 pr-10 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-all text-sm"
        />
        {filters.searchQuery && (
          <button
            onClick={() => onChange({ ...filters, searchQuery: '' })}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-stone-500 mr-1">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filtros:
        </span>

        {/* Categories */}
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
        >
          <option value="all">Todas as Categorias</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </option>
          ))}
        </select>

        {/* Pricing Model */}
        <select
          value={filters.pricingModel}
          onChange={(e) => onChange({ ...filters, pricingModel: e.target.value })}
          className="px-2.5 py-1.5 bg-stone-50 border border-stone-200 rounded-lg text-stone-700 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
        >
          {pricingModels.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>

        {/* Price Tier Buttons */}
        <div className="inline-flex rounded-lg border border-stone-200 p-0.5 bg-stone-50">
          {priceTiers.map((tier) => (
            <button
              key={tier.value}
              onClick={() => onChange({ ...filters, priceTier: tier.value })}
              type="button"
              className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                filters.priceTier === tier.value
                  ? 'bg-white text-stone-900 shadow-xs'
                  : 'text-stone-500 hover:text-stone-800'
              }`}
            >
              {tier.label.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Clear filters button */}
        {hasActiveFilters && (
          <button
            onClick={handleClear}
            className="ml-auto inline-flex items-center gap-1 text-stone-500 hover:text-orange-600 transition-colors py-1 px-2 font-medium"
          >
            <X className="w-3.5 h-3.5" />
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  );
};

