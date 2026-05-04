export type DietPreference = 'Keto' | 'Vegan' | 'Vegetarian' | 'High Protein' | 'High Carbs';
export type BudgetLevel = 'Budget' | 'Moderate' | 'Premium';

export interface UserProfileData {
  id: string;
  name: string;
  email?: string;
  avatarColor?: string;
  avatar_color?: string;
  avatarUrl?: string;
  avatar_url?: string;
}

export interface UserPreferences {
  diet: DietPreference;
  allergies: string[];
  budget: BudgetLevel;
  cuisines: string[];
  calorieGoal?: number;
  mealType?: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Any';
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  image: string;
  prepTime: string;
  calories: number;
  budget: BudgetLevel;
  estimatedCost: number;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  ingredients: string[];
  instructions: string[];
  nutrients: {
    protein: string;
    carbs: string;
    fat: string;
  };
  tags: string[];
  videoUrl?: string;
  rating?: number;
  ratingCount?: number;
}

export interface Review {
  id: string;
  user_id: string;
  recipeId: string;
  userName: string;
  rating: number;
  comment: string;
  date: string;
}

export type NotificationType = 'recipe_ready' | 'new_favorite' | 'recipe_cooked' | 'system';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  link?: string;
}

export interface NewsfeedItem {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar_color?: string;
  user_avatar_url?: string;
  type: 'cooked' | 'shared' | 'favorite' | 'post';
  content?: string;
  recipe_id?: string;
  recipe_title?: string;
  recipe_image?: string;
  likes_count?: number;
  comments_count?: number;
  has_liked?: boolean;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  user_name: string;
  user_avatar_color?: string;
  user_avatar_url?: string;
  content: string;
  created_at: string;
}

export interface MealPlan {
  id: string;
  user_id: string;
  recipe_id: string;
  recipe_title: string;
  recipe_image: string;
  date: string; // ISO date string
  meal_type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  is_meal_prep?: boolean;
}

export interface Friendship {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend?: UserProfileData; // Joined user data
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  media_url?: string;
  media_type?: 'image' | 'video';
  is_deleted?: boolean;
  read: boolean;
  created_at: string;
}

export interface Conversation {
  id: string;
  participant_ids: string[];
  last_message?: {
    content: string;
    sender_id: string;
    created_at: string;
  };
  is_restricted?: boolean;
  updated_at: string;
  participants?: UserProfileData[]; // Joined user data
}

export type AppErrorSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AppError {
  message: string;
  code?: string;
  severity: AppErrorSeverity;
  retryable?: boolean;
  actionLabel?: string;
  onAction?: () => void;
}
