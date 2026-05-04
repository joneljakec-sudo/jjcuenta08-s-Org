import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Recipe, Review } from '../types';
import RecipeCard from './RecipeCard';
import { Heart, ChefHat, MessageSquare, Plus, Utensils, Trash2 } from 'lucide-react';
import { RecipeCardSkeleton, Skeleton } from './ui/Skeleton';

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
  onRate?: (recipeId: string, rating: number) => void;
  loading?: boolean;
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
  onDeleteFromHistory,
  onRate,
  loading
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
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(3)].map((_, i) => <RecipeCardSkeleton key={i} />)}
                </div>
              ) : favorites.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {favorites.map(recipe => (
                    <Swipeable key={recipe.id} onDelete={() => onToggleFavorite({ stopPropagation: () => {} } as any, recipe.id)}>
                      <RecipeCard 
                        recipe={recipe} 
                        onClick={onRecipeClick}
                        isFavorite={favoriteIds.includes(recipe.id)}
                        onToggleFavorite={(e) => onToggleFavorite(e, recipe.id)}
                        onUpdateRecipe={onUpdateRecipe}
                        onRate={onRate}
                      />
                    </Swipeable>
                  ))}
                </div>
              ) : (
                <div className="card p-20 text-center border-2 border-dashed border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] rounded-[3rem]">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Heart className="mx-auto mb-6 text-brand-clay opacity-30" size={64} strokeWidth={1.5} />
                    <h3 className="text-3xl font-serif mb-3 text-brand-ink">Your collection awaits</h3>
                    <p className="text-brand-ink-muted italic max-w-sm mx-auto mb-8 leading-relaxed">
                      Keep track of the dishes that inspire you. Tap the heart on any recipe card to save it here for your next culinary session.
                    </p>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-ink-subtle">
                      Find inspiration in the neighborhood feed
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'cooked' && (
            <motion.div
              key="cooked"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(3)].map((_, i) => <RecipeCardSkeleton key={i} />)}
                </div>
              ) : cooked.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {cooked.map(recipe => (
                    <Swipeable key={recipe.id} onDelete={() => onDeleteFromHistory?.(recipe.id)} confirmMessage="Remove from history? This will also delete your feedbacks for this recipe.">
                      <RecipeCard 
                        recipe={recipe} 
                        onClick={onRecipeClick}
                        isFavorite={favoriteIds.includes(recipe.id)}
                        onToggleFavorite={(e) => onToggleFavorite(e, recipe.id)}
                        onUpdateRecipe={onUpdateRecipe}
                        onRate={onRate}
                      />
                    </Swipeable>
                  ))}
                </div>
              ) : (
                <div className="card p-20 text-center border-2 border-dashed border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] rounded-[3rem]">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <ChefHat className="mx-auto mb-6 text-brand-ink-subtle opacity-30" size={64} strokeWidth={1.5} />
                    <h3 className="text-3xl font-serif mb-3 text-brand-ink">Start your cooking story</h3>
                    <p className="text-brand-ink-muted italic max-w-sm mx-auto mb-8 leading-relaxed">
                      Every great chef has a legacy. Mark recipes as "Cooked" to build your personal timeline of culinary successes.
                    </p>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-ink-subtle">
                      Your milestones will appear here
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'posts' && (
            <motion.div
              key="posts"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(3)].map((_, i) => <RecipeCardSkeleton key={i} />)}
                </div>
              ) : userRecipes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {userRecipes.map(recipe => (
                    <Swipeable key={recipe.id} onDelete={() => onDeleteUserRecipe?.(recipe.id)} confirmMessage="Delete this recipe permanently?">
                      <RecipeCard 
                        recipe={recipe} 
                        onClick={onRecipeClick}
                        isFavorite={favoriteIds.includes(recipe.id)}
                        onToggleFavorite={(e) => onToggleFavorite(e, recipe.id)}
                        onUpdateRecipe={onUpdateRecipe}
                        onRate={onRate}
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
                <div className="card p-20 text-center border-2 border-dashed border-brand-olive/10 dark:border-brand-olive/10 bg-brand-olive/[0.02] rounded-[3rem]">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <ChefHat className="mx-auto mb-6 text-brand-olive opacity-30" size={64} strokeWidth={1.5} />
                    <h3 className="text-3xl font-serif mb-3 text-brand-ink">Share your culinary wisdom</h3>
                    <p className="text-brand-ink-muted italic max-w-sm mx-auto mb-10 leading-relaxed">
                      Your kitchen creations deserve a spotlight. Share your secret family recipes or new experiments and inspire the whole neighborhood.
                    </p>
                    <button 
                      onClick={onPostRecipe}
                      className="btn-primary inline-flex items-center gap-2 shadow-xl shadow-brand-olive/20 px-8 py-4"
                    >
                      <Plus size={20} />
                      Share your first recipe
                    </button>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'feedbacks' && (
            <motion.div
              key="feedbacks"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
            >
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="card p-8 h-full space-y-4">
                      <Skeleton variant="text" className="w-1/4 h-4" />
                      <Skeleton variant="text" className="w-full h-20" />
                    </div>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
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
                <div className="card p-20 text-center border-2 border-dashed border-black/5 dark:border-white/5 bg-black/[0.02] dark:bg-white/[0.02] rounded-[3rem]">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <MessageSquare className="mx-auto mb-6 text-brand-ink-subtle opacity-30" size={64} strokeWidth={1.5} />
                    <h3 className="text-3xl font-serif mb-3 text-brand-ink">Be a culinary critic</h3>
                    <p className="text-brand-ink-muted italic max-w-sm mx-auto mb-8 leading-relaxed">
                      Help your neighbors by sharing your honest thoughts. Your feedbacks on recipes you've cooked provide the best kitchen guidance.
                    </p>
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-ink-subtle">
                      Share your first feedback today
                    </div>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
