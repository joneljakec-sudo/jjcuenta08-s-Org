import React, { useState } from 'react';
import { Recipe } from '../types';
import { Clock, Flame, ChevronRight, Heart, RefreshCw, Trash2, Image as ImageIcon, Star } from 'lucide-react';
import { motion } from 'motion/react';
import { generateRecipeImage } from '../services/geminiService';
import { supabase } from '../lib/supabase';

interface RecipeCardProps {
  recipe: Recipe;
  onClick: (recipe: Recipe) => void;
  isFavorite?: boolean;
  onToggleFavorite?: (e: React.MouseEvent) => void;
  onUpdateRecipe?: (updatedRecipe: Recipe) => void;
  onDelete?: (e: React.MouseEvent) => void;
  onRate?: (recipeId: string, rating: number) => void;
}

export default function RecipeCard({ recipe, onClick, isFavorite, onToggleFavorite, onUpdateRecipe, onDelete, onRate }: RecipeCardProps) {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const isFallback = recipe.image?.includes('loremflickr.com');

  const handleRegenerateImage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRegenerating) return;

    setIsRegenerating(true);
    try {
      const newImageUrl = await generateRecipeImage(recipe.title);
      const updatedRecipe = { ...recipe, image: newImageUrl };
      
      // Update in Supabase if it's a global recipe
      const { error } = await supabase
        .from('global_recipes')
        .update({ recipe_data: updatedRecipe })
        .eq('title', recipe.title);

      if (error) console.error("Error updating recipe image in Supabase:", error);
      
      if (onUpdateRecipe) {
        onUpdateRecipe(updatedRecipe);
      }
    } catch (error) {
      console.error("Failed to regenerate image:", error);
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="card cursor-pointer group"
      onClick={() => onClick(recipe)}
    >
      <div className="relative h-64 overflow-hidden">
        <img 
          src={recipe.image} 
          alt={recipe.title} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
          <div className="flex gap-2">
            {isFallback && (
              <button 
                onClick={handleRegenerateImage}
                disabled={isRegenerating}
                className="p-2 rounded-full bg-brand-olive/90 text-white backdrop-blur hover:bg-brand-olive transition-all shadow-lg group/btn"
                title="Generate AI Image"
              >
                <RefreshCw size={16} className={isRegenerating ? 'animate-spin' : 'group-hover/btn:rotate-180 transition-transform duration-500'} />
              </button>
            )}
            {onToggleFavorite && (
              <button 
                onClick={onToggleFavorite}
                className={`p-2 rounded-full backdrop-blur transition-colors shadow-lg ${isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 dark:bg-brand-card/90 text-brand-ink-subtle hover:text-red-500'}`}
              >
                <Heart size={16} fill={isFavorite ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
          
          <div className="flex flex-col items-end gap-1.5">
            <div className="bg-brand-ink text-white dark:bg-white dark:text-brand-ink px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-xl">
              <span className="opacity-70">₱</span>
              {recipe.estimatedCost}
            </div>
            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-xl backdrop-blur-md ${
              recipe.difficulty === 'Easy' ? 'bg-emerald-500 text-white' :
              recipe.difficulty === 'Medium' ? 'bg-amber-500 text-white' :
              'bg-rose-500 text-white'
            }`}>
              {recipe.difficulty}
            </div>
          </div>
        </div>
        {isRegenerating && (
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center">
            <RefreshCw size={32} className="animate-spin mb-4" />
            <p className="font-bold text-sm">Generating AI Image...</p>
            <p className="text-xs opacity-80 mt-1">Using Imagen 4.0</p>
          </div>
        )}
      </div>
      <div className="p-8">
        <div className="flex gap-2 mb-4">
          {recipe.tags.slice(0, 2).map(tag => (
            <span key={tag} className="text-xs uppercase tracking-widest font-bold text-brand-olive">
              {tag}
            </span>
          ))}
          {onDelete && (
            <button 
              onClick={onDelete}
              className="ml-auto p-1 text-brand-ink-subtle hover:text-red-500 transition-colors"
              title="Delete Recipe"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
        <h3 className="text-2xl mb-2 group-hover:text-brand-olive transition-colors">{recipe.title}</h3>
        
        <div className="flex items-center gap-2 mb-4 group/rating">
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  e.stopPropagation();
                  if (onRate) onRate(recipe.id, star);
                }}
                className="focus:outline-none hover:scale-125 transition-transform"
              >
                <Star
                  size={18}
                  fill={star <= (recipe.rating || 0) ? '#EAB308' : 'none'}
                  className={star <= (recipe.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}
                  strokeWidth={star <= (recipe.rating || 0) ? 0 : 2}
                />
              </button>
            ))}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-black text-brand-ink">
              {recipe.rating ? recipe.rating.toFixed(1) : 'New'}
            </span>
            <span className="text-[10px] text-brand-ink-subtle font-bold leading-none capitalize">
              {recipe.ratingCount || 0} reviews
            </span>
          </div>
        </div>

        <p className="text-brand-ink-muted text-sm line-clamp-2 mb-6">{recipe.description}</p>
        
        <div className="flex items-center justify-between pt-6 border-t border-black/5 dark:border-white/5">
          <div className="flex gap-4">
            <div className="flex items-center gap-1 text-sm font-bold text-brand-ink-muted">
              <Clock size={14} />
              {recipe.prepTime}
            </div>
            <div className="flex items-center gap-1 text-sm font-bold text-brand-ink-muted">
              <Flame size={14} />
              {recipe.calories} kcal
            </div>
          </div>
          <ChevronRight size={20} className="text-brand-olive opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0" />
        </div>
      </div>
    </motion.div>
  );
}
