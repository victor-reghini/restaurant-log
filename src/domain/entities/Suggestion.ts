/**
 * Domain entity: Suggestion
 * Allows users to suggest new restaurants or updates without direct open-table vandalism.
 */

import { Restaurant } from './Restaurant';

export type SuggestionType = 'new' | 'update';
export type SuggestionStatus = 'pending' | 'approved' | 'rejected';

export interface Suggestion {
  id: string;
  type: SuggestionType;
  targetRestaurantId?: string;
  data: Partial<Restaurant>;
  suggestedBy: {
    userId: string;
    userName: string;
  };
  status: SuggestionStatus;
  adminNotes?: string;
  createdAt: string;
}

