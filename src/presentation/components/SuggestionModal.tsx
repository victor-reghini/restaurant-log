import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Send, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Restaurant, PriceTier, PricingModel, MenuType } from '../../domain/entities/Restaurant';
import { restaurantRepository } from '../../infrastructure/config';

interface SuggestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetRestaurant?: Restaurant | null;
  onSuccess: () => void;
}

export const SuggestionModal: React.FC<SuggestionModalProps> = ({
  isOpen,
  onClose,
  targetRestaurant,
  onSuccess,
}) => {
  const isUpdate = Boolean(targetRestaurant);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('brasileira');
  const [address, setAddress] = useState('');
  const [priceTier, setPriceTier] = useState<PriceTier>('$$');
  const [pricingModel, setPricingModel] = useState<PricingModel>('fixed');
  const [pricingNote, setPricingNote] = useState('');
  const [menuType, setMenuType] = useState<MenuType>('daily');
  const [openingHours, setOpeningHours] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [suggestedByName, setSuggestedByName] = useState('');

  // Duplicate warning detection
  const [potentialDuplicates, setPotentialDuplicates] = useState<Restaurant[]>([]);
  const [isCheckingDuplicates, setIsCheckingDuplicates] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Populate data if updating existing restaurant
  useEffect(() => {
    if (targetRestaurant) {
      setName(targetRestaurant.name);
      setDescription(targetRestaurant.description);
      setCategory(targetRestaurant.category);
      setAddress(targetRestaurant.address);
      setPriceTier(targetRestaurant.priceTier);
      setPricingModel(targetRestaurant.pricingModel);
      setPricingNote(targetRestaurant.pricingNote || '');
      setMenuType(targetRestaurant.menuType);
      setOpeningHours(targetRestaurant.openingHours);
      setImageUrl(targetRestaurant.imageUrl);
    } else {
      setName('');
      setDescription('');
      setCategory('brasileira');
      setAddress('');
      setPriceTier('$$');
      setPricingModel('fixed');
      setPricingNote('');
      setMenuType('daily');
      setOpeningHours('');
      setImageUrl('');
    }
    setPotentialDuplicates([]);
    setIsSuccess(false);
  }, [targetRestaurant, isOpen]);

  // Check duplicate debounced on name change (only for new suggestions)
  useEffect(() => {
    if (isUpdate || !name.trim() || name.trim().length < 3) {
      setPotentialDuplicates([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingDuplicates(true);
      try {
        const matches = await restaurantRepository.findDuplicates(name.trim());
        setPotentialDuplicates(matches);
      } finally {
        setIsCheckingDuplicates(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [name, isUpdate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await restaurantRepository.submitSuggestion({
        type: isUpdate ? 'update' : 'new',
        targetRestaurantId: targetRestaurant?.id,
        suggestedBy: {
          userId: 'user-client',
          userName: suggestedByName.trim() || 'Usuário Colaborador',
        },
        data: {
          name: name.trim(),
          description: description.trim(),
          category,
          address: address.trim(),
          priceTier,
          pricingModel,
          pricingNote: pricingNote.trim(),
          menuType,
          openingHours: openingHours.trim(),
          imageUrl: imageUrl.trim() || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
          coordinates: targetRestaurant?.coordinates || { latitude: -23.5615, longitude: -46.6559 },
          menuItems: targetRestaurant?.menuItems || [],
        },
      });

      setIsSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2500);
    } catch (err) {
      console.error('Erro ao enviar sugestão:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-stone-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative bg-white w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-lg text-stone-900">
                {isUpdate ? 'Sugerir Alteração de Restaurante' : 'Sugerir Novo Restaurante'}
              </h3>
            </div>
            <p className="text-xs text-stone-500 mt-1">
              Envio sujeito à moderação para garantir a qualidade e evitar duplicidades.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-200/60 transition-colors text-stone-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
          {isSuccess ? (
            <div className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-14 h-14 text-emerald-600 mx-auto animate-bounce" />
              <h4 className="font-bold text-lg text-stone-900">Sugestão enviada com sucesso!</h4>
              <p className="text-stone-600 text-sm max-w-md mx-auto">
                Obrigado por contribuir. A equipe irá analisar a sugestão antes de publicá-la no catálogo oficial.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              {/* Anti-Duplication Warning */}
              {potentialDuplicates.length > 0 && !isUpdate && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Atenção: Restaurante similar já existente!</span>
                  </div>
                  <p className="text-amber-800 text-[11px]">
                    Encontramos estabelecimentos já cadastrados com nome parecido. Verifique para não gerar duplicidade:
                  </p>
                  <ul className="list-disc pl-5 space-y-1 text-amber-950 font-medium">
                    {potentialDuplicates.map((dup) => (
                      <li key={dup.id}>
                        {dup.name} ({dup.address})
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">
                  Nome do Restaurante *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Restaurante Sabor de Casa"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
                {isCheckingDuplicates && (
                  <span className="text-[10px] text-stone-400 mt-1 block">Verificando duplicidades...</span>
                )}
              </div>

              {/* Category & Price Tier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Categoria *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="brasileira">Comida Brasileira / Caseira</option>
                    <option value="buffet">Buffet / Por Quilo</option>
                    <option value="pizza">Pizza</option>
                    <option value="hamburguer">Hambúrguer</option>
                    <option value="vegetariana">Vegetariana / Saudável</option>
                    <option value="japonesa">Japonesa</option>
                    <option value="italiana">Italiana</option>
                    <option value="outro">Outro</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Faixa de Preço *</label>
                  <select
                    value={priceTier}
                    onChange={(e) => setPriceTier(e.target.value as PriceTier)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="$">$ (Até R$ 35)</option>
                    <option value="$$">$$ (R$ 35 a R$ 70)</option>
                    <option value="$$$">$$$ (Acima de R$ 70)</option>
                  </select>
                </div>
              </div>

              {/* Pricing Model & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Modelo de Cobrança *</label>
                  <select
                    value={pricingModel}
                    onChange={(e) => setPricingModel(e.target.value as PricingModel)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="fixed">Buffet Livre / Preço Fixo</option>
                    <option value="per_kilo">Buffet por Quilo</option>
                    <option value="a_la_carte">Pratos Feitos / À la Carte</option>
                    <option value="mixed">Misto (Livre ou Balança)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Detalhes de Preço</label>
                  <input
                    type="text"
                    value={pricingNote}
                    onChange={(e) => setPricingNote(e.target.value)}
                    placeholder="Ex: Livre R$ 35,00 ou R$ 69,90/kg"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Menu Type & Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">Estrutura do Cardápio *</label>
                  <select
                    value={menuType}
                    onChange={(e) => setMenuType(e.target.value as MenuType)}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  >
                    <option value="daily">Cardápio por dia da semana (Seg-Sáb)</option>
                    <option value="weekly_fixed">Cardápio fixo semanal</option>
                    <option value="dish_list">Lista de pratos com preços</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Horário de Funcionamento</label>
                  <input
                    type="text"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    placeholder="Ex: Seg - Sex: 11:30 às 15:00"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua, número, bairro, cidade - UF"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-bold text-stone-700 mb-1">Descrição e Recomendações</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Conte um pouco sobre o ambiente, pratos recomendados, etc."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              {/* Photo & Submitter */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-stone-700 mb-1">URL da Imagem de Capa</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-stone-700 mb-1">Seu Nome / Identificação</label>
                  <input
                    type="text"
                    value={suggestedByName}
                    onChange={(e) => setSuggestedByName(e.target.value)}
                    placeholder="Ex: Pedro Alvares"
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !name.trim()}
                  className="inline-flex items-center gap-1.5 px-5 py-2 bg-orange-600 text-white rounded-lg text-xs font-bold hover:bg-orange-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Enviando...' : 'Enviar Sugestão'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
