export type DietPreference = 'Keto' | 'Vegan' | 'Vegetarian' | 'High Protein' | 'High Carbs';
export type BudgetLevel = 'Budget' | 'Moderate' | 'Premium';

export interface UserProfileData {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarUrl?: string;
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
  type: 'cooked' | 'shared' | 'favorite';
  recipe_id: string;
  recipe_title: string;
  recipe_image: string;
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
