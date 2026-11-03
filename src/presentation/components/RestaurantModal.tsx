import React, { useState, useEffect } from 'react';
import { X, MapPin, Clock, Heart, MessageSquare, Camera, Check, AlertCircle, Edit3 } from 'lucide-react';
import { Restaurant, MenuItem } from '../../domain/entities/Restaurant';
import { Review } from '../../domain/entities/Review';
import { restaurantRepository } from '../../infrastructure/config';
import { StarRating } from './StarRating';

interface RestaurantModalProps {
  restaurant: Restaurant | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onSuggestUpdate: (restaurant: Restaurant) => void;
  onReviewAdded: () => void;
}

export const RestaurantModal: React.FC<RestaurantModalProps> = ({
  restaurant,
  onClose,
  isFavorite,
  onToggleFavorite,
  onSuggestUpdate,
  onReviewAdded,
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'reviews'>('menu');
  const [selectedDay, setSelectedDay] = useState<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun'>('mon');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // New review state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewAuthor, setReviewAuthor] = useState<string>('');
  const [reviewPhotoUrl, setReviewPhotoUrl] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);

  useEffect(() => {
    if (!restaurant) return;
    const daysMap: Record<number, 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'> = {
      0: 'sun', 1: 'mon', 2: 'tue', 3: 'wed', 4: 'thu', 5: 'fri', 6: 'sat'
    };
    setSelectedDay(daysMap[new Date().getDay()] || 'mon');

    // Fetch reviews
    setLoadingReviews(true);
    restaurantRepository.getReviews(restaurant.id)
      .then((data) => setReviews(data))
      .catch((err) => console.error('Erro ao buscar reviews:', err))
      .finally(() => setLoadingReviews(false));
  }, [restaurant]);

  if (!restaurant) return null;

  const daysLabels: Record<string, string> = {
    mon: 'Segunda',
    tue: 'Terça',
    wed: 'Quarta',
    thu: 'Quinta',
    fri: 'Sexta',
    sat: 'Sábado',
    sun: 'Domingo',
  };

  const handleAddReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    setIsSubmittingReview(true);
    try {
      const newRev = await restaurantRepository.addReview({
        restaurantId: restaurant.id,
        userId: 'current-user',
        userName: reviewAuthor.trim() || 'Usuário Convidado',
        rating: reviewRating,
        comment: reviewComment.trim(),
        photoUrls: reviewPhotoUrl.trim() ? [reviewPhotoUrl.trim()] : [],
      });

      setReviews((prev) => [newRev, ...prev]);
      setReviewComment('');
      setReviewPhotoUrl('');
      setReviewSuccess(true);
      onReviewAdded();
      setTimeout(() => setReviewSuccess(false), 4000);
    } catch (err) {
      console.error('Erro ao adicionar comentário:', err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Filter menu items by day if daily
  const dailyItems = restaurant.menuType === 'daily'
    ? restaurant.menuItems.filter((m) => m.dayOfWeek === selectedDay)
    : restaurant.menuItems;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative bg-white w-full max-w-3xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Banner with controls */}
        <div className="relative h-60 sm:h-72 w-full bg-stone-900 shrink-0">
          <img
            src={restaurant.imageUrl}
            alt={restaurant.name}
            className="w-full h-full object-cover opacity-85"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/30 to-transparent" />

          {/* Close & Action Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            <button
              onClick={() => onToggleFavorite(restaurant.id)}
              className="p-2.5 rounded-full bg-white/90 backdrop-blur-sm text-stone-800 hover:text-rose-600 transition-colors shadow-sm"
              aria-label="Favoritar"
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/90 backdrop-blur-sm text-stone-800 hover:text-stone-950 transition-colors shadow-sm"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header Info */}
          <div className="absolute bottom-4 left-6 right-6 text-white">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md text-xs font-bold bg-orange-600">
                {restaurant.category.toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-white/20 backdrop-blur-sm">
                Faixa: {restaurant.priceTier}
              </span>
              {restaurant.distanceKm !== undefined && (
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-emerald-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {restaurant.distanceKm} km de você
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {restaurant.name}
            </h2>

            <div className="flex items-center gap-2 mt-1 text-sm text-stone-200">
              <StarRating rating={restaurant.rating} size="sm" />
              <span className="font-bold">{restaurant.rating.toFixed(1)}</span>
              <span>({restaurant.reviewCount} avaliações)</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          {/* Quick details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200/80 text-sm">
            <div className="space-y-2">
              <div className="flex items-start gap-2 text-stone-700">
                <MapPin className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                <span>{restaurant.address}</span>
              </div>
              <div className="flex items-center gap-2 text-stone-700">
                <Clock className="w-4 h-4 text-orange-600 shrink-0" />
                <span>{restaurant.openingHours}</span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wide">Modelo de Preço</span>
              <p className="font-semibold text-stone-900">
                {restaurant.pricingNote || 'Preços sob consulta'}
              </p>
              <button
                type="button"
                onClick={() => onSuggestUpdate(restaurant)}
                className="inline-flex items-center gap-1.5 text-xs text-orange-600 font-semibold hover:text-orange-700 mt-1"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Sugerir atualização de informações
              </button>
            </div>
          </div>

          <p className="text-stone-700 text-sm leading-relaxed">
            {restaurant.description}
          </p>

          {/* Navigation Tabs */}
          <div className="border-b border-stone-200 flex gap-6 text-sm font-semibold">
            <button
              onClick={() => setActiveTab('menu')}
              className={`pb-3 transition-colors border-b-2 -mb-px ${
                activeTab === 'menu'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              Cardápio & Pratos ({restaurant.menuItems.length})
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`pb-3 transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
                activeTab === 'reviews'
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-stone-500 hover:text-stone-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Comentários & Fotos ({reviews.length})
            </button>
          </div>

          {/* Tab 1: Menu */}
          {activeTab === 'menu' && (
            <div className="space-y-4">
              {/* If daily menu, show day-selector pills */}
              {restaurant.menuType === 'daily' && (
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase mb-2">
                    Cardápio do dia da semana:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(['mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const).map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          selectedDay === day
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
                        }`}
                      >
                        {daysLabels[day]}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Items List */}
              <div className="grid grid-cols-1 gap-3">
                {dailyItems.length === 0 ? (
                  <p className="text-stone-500 text-sm py-4 italic">
                    Nenhum prato cadastrado especificamente para este dia.
                  </p>
                ) : (
                  dailyItems.map((item: MenuItem) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/50 flex items-start justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-stone-900 text-sm">{item.name}</span>
                          {item.isHighlight && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              Destaque
                            </span>
                          )}
                          {item.category && (
                            <span className="text-[11px] text-stone-500 font-medium">
                              • {item.category}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="text-xs text-stone-600 mt-1">{item.description}</p>
                        )}
                      </div>
                      {item.price !== undefined && (
                        <span className="font-bold text-sm text-stone-900 shrink-0">
                          R$ {item.price.toFixed(2).replace('.', ',')}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Reviews & Photos */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {/* Add Review Form */}
              <form onSubmit={handleAddReview} className="bg-stone-50 p-4 rounded-2xl border border-stone-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-stone-900">Deixe sua avaliação</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-stone-600">Nota:</span>
                    <StarRating
                      rating={reviewRating}
                      interactive={true}
                      onRatingChange={(r) => setReviewRating(r)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    placeholder="Seu nome (ex: Ana Silva)"
                    className="px-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                  <div className="relative">
                    <Camera className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="url"
                      value={reviewPhotoUrl}
                      onChange={(e) => setReviewPhotoUrl(e.target.value)}
                      placeholder="URL da foto do prato (opcional)"
                      className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                    />
                  </div>
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  required
                  rows={2}
                  placeholder="O que você achou da comida, preço e atendimento?"
                  className="w-full p-3 text-xs bg-white border border-stone-200 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />

                <div className="flex items-center justify-between">
                  {reviewSuccess && (
                    <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Avaliação enviada com sucesso!
                    </span>
                  )}
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !reviewComment.trim()}
                    className="ml-auto px-4 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-xs"
                  >
                    {isSubmittingReview ? 'Publicando...' : 'Publicar Avaliação'}
                  </button>
                </div>
              </form>

              {/* Reviews List */}
              {loadingReviews ? (
                <p className="text-stone-400 text-xs py-4 text-center">Carregando comentários...</p>
              ) : reviews.length === 0 ? (
                <div className="text-center py-8 text-stone-400 text-sm">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-stone-300" />
                  Seja o primeiro a avaliar este restaurante!
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="p-4 rounded-xl border border-stone-200 bg-white space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-stone-200 flex items-center justify-center font-bold text-xs text-stone-700">
                            {rev.userName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-xs text-stone-900 block">{rev.userName}</span>
                            <span className="text-[10px] text-stone-400">
                              {new Date(rev.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                        </div>
                        <StarRating rating={rev.rating} size="sm" />
                      </div>

                      <p className="text-xs text-stone-700 leading-relaxed">{rev.comment}</p>

                      {rev.photoUrls && rev.photoUrls.length > 0 && (
                        <div className="flex gap-2 pt-1 overflow-x-auto">
                          {rev.photoUrls.map((url, i) => (
                            <img
                              key={i}
                              src={url}
                              alt="Foto do cliente"
                              className="w-20 h-20 object-cover rounded-lg border border-stone-200"
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

