import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe, Review } from '../types';
import RecipeCard from './RecipeCard';
import { Heart, ChefHat, MessageSquare, Plus, Utensils, Trash2 } from 'lucide-react';

interface MyKitchenProps {
  favorites: Recipe[];
  cooked: Recipe[];
  userRecipes: Recipe[];
  reviews: Review[];
  onRecipeClick: (recipe: Recipe) => void;
  onPostRecipe: () => void;
  favoriteIds: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  activeTab: Tab;
  onUpdateRecipe?: (updatedRecipe: Recipe) => void;
  currentUserId?: string;
  onDeleteReview?: (id: string) => void;
  onDeleteUserRecipe?: (id: string) => void;
  onDeleteFromHistory?: (id: string) => void;
}

export type Tab = 'favorites' | 'cooked' | 'posts' | 'feedbacks';

import Swipeable from './ui/Swipeable';

export default function MyKitchen({ 
  favorites, 
  cooked, 
  userRecipes, 
  reviews, 
  onRecipeClick,
  onPostRecipe,
  favoriteIds,
  onToggleFavorite,
  activeTab,
  onUpdateRecipe,
  currentUserId,
  onDeleteReview,
  onDeleteUserRecipe,
  onDeleteFromHistory
}: MyKitchenProps) {
  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-5xl mb-2 capitalize">
            {activeTab === 'posts' ? 'My Recipes' : activeTab}
          </h2>
          <p className="text-brand-ink-muted serif italic text-lg">
            {activeTab === 'favorites' && "Dishes you've saved for later."}
            {activeTab === 'cooked' && "A timeline of your culinary adventures."}
            {activeTab === 'posts' && "Recipes you've shared with the community."}
            {activeTab === 'feedbacks' && "Your reviews and thoughts on recipes."}
          </p>
        </div>
        {activeTab === 'posts' && (
          <button 
            onClick={onPostRecipe}
            className="btn-primary flex items-center gap-2 shadow-lg shadow-brand-olive/20"
          >
            <Plus size={20} />
            Post New Recipe
          </button>
        )}
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          {activeTab === 'favorites' && (
            <motion.div
              key="favorites"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {favorites.map(recipe => (
                    <Swipeable key={recipe.id} onDelete={() => onToggleFavorite({ stopPropagation: () => {} } as any, recipe.id)}>
                      <RecipeCard 
                        recipe={recipe} 
                        onClick={onRecipeClick}
                        isFavorite={favoriteIds.includes(recipe.id)}
                        onToggleFavorite={(e) => onToggleFavorite(e, recipe.id)}
                        onUpdateRecipe={onUpdateRecipe}
                      />
                    </Swipeable>
                  ))}
                </div>
              ) : (
                <div className="card p-20 text-center border border-dashed border-black/10 dark:border-white/10">
                  <Heart className="mx-auto mb-4 text-brand-ink-subtle opacity-20" size={48} />
                  <p className="text-brand-ink-muted serif italic text-xl">Your favorites list is empty.</p>
                  <p className="text-sm text-brand-ink-subtle mt-2">Save recipes you love to see them here.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'cooked' && (
            <motion.div
              key="cooked"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {cooked.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {cooked.map(recipe => (
                    <Swipeable key={recipe.id} onDelete={() => onDeleteFromHistory?.(recipe.id)} confirmMessage="Remove from history? This will also delete your feedbacks for this recipe.">
                      <RecipeCard 
                        recipe={recipe} 
                        onClick={onRecipeClick}
                        isFavorite={favoriteIds.includes(recipe.id)}
                        onToggleFavorite={(e) => onToggleFavorite(e, recipe.id)}
                        onUpdateRecipe={onUpdateRecipe}
                      />
                    </Swipeable>
                  ))}
                </div>
              ) : (
                <div className="card p-20 text-center border border-dashed border-black/10 dark:border-white/10">
                  <ChefHat className="mx-auto mb-4 text-brand-ink-subtle opacity-20" size={48} />
                  <p className="text-brand-ink-muted serif italic text-xl">You haven't marked any recipes as cooked yet.</p>
                  <p className="text-sm text-brand-ink-subtle mt-2">Complete a recipe to add it to your history.</p>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {userRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {userRecipes.map(recipe => (
                    <Swipeable key={recipe.id} onDelete={() => onDeleteUserRecipe?.(recipe.id)} confirmMessage="Delete this recipe permanently?">
                      <RecipeCard 
                        recipe={recipe} 
                        onClick={onRecipeClick}
                        isFavorite={favoriteIds.includes(recipe.id)}
                        onToggleFavorite={(e) => onToggleFavorite(e, recipe.id)}
                        onUpdateRecipe={onUpdateRecipe}
                        onDelete={(e) => {
                          e.stopPropagation();
                          if (confirm('Are you sure you want to delete this recipe?')) {
                            onDeleteUserRecipe?.(recipe.id);
                          }
                        }}
                      />
                    </Swipeable>
                  ))}
                </div>
              ) : (
                <div className="card p-20 text-center border border-dashed border-black/10 dark:border-white/10">
                  <Utensils className="mx-auto mb-4 text-brand-olive/20" size={48} />
                  <p className="text-brand-ink-muted serif italic text-xl">You haven't shared any recipes yet.</p>
                  <button onClick={onPostRecipe} className="mt-6 text-brand-olive font-bold uppercase tracking-widest text-sm hover:underline">
                    Share your first recipe
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'feedbacks' && (
            <motion.div
              key="feedbacks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {reviews.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reviews.map(review => (
                    <Swipeable key={review.id} onDelete={() => onDeleteReview?.(review.id)} confirmMessage="Delete this feedback?">
                      <div className="card p-8 h-full">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex gap-1 text-brand-clay mb-1">
                              {Array.from({ length: review.rating }).map((_, i) => (
                                <Heart key={i} size={14} fill="currentColor" className="text-brand-clay" />
                              ))}
                            </div>
                            <div className="text-xs font-bold uppercase text-brand-ink-subtle">{review.date}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            {currentUserId === review.user_id && onDeleteReview && (
                              <button 
                                onClick={() => {
                                  if (confirm('Delete this feedback?')) {
                                    onDeleteReview(review.id);
                                  }
                                }}
                                className="p-2 text-brand-ink-subtle hover:text-red-500 transition-colors"
                                title="Delete Feedback"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                            <div className="bg-brand-olive/5 text-brand-olive px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                              Verified Cook
                            </div>
                          </div>
                        </div>
                        <p className="text-brand-ink italic text-lg leading-relaxed">"{review.comment}"</p>
                      </div>
                    </Swipeable>
                  ))}
                </div>
              ) : (
                <div className="card p-20 text-center border border-dashed border-black/10 dark:border-white/10">
                  <MessageSquare className="mx-auto mb-4 text-brand-ink-subtle opacity-20" size={48} />
                  <p className="text-brand-ink-muted serif italic text-xl">No feedbacks posted yet.</p>
                  <p className="text-sm text-brand-ink-subtle mt-2">Share your thoughts on recipes you've cooked.</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
