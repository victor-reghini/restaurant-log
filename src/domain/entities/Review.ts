/**
 * Domain entity: Review
 * User ratings, comments, and optional photo attachments.
 */

export interface Review {
  id: string;
  restaurantId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number; // 0 to 5
  comment: string;
  photoUrls: string[];
  createdAt: string;
}

