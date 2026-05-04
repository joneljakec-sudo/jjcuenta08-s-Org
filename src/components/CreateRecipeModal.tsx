import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, Loader2, Sparkles } from 'lucide-react';
import { Recipe, BudgetLevel } from '../types';
import { generateRecipeImage } from '../services/geminiService';

interface CreateRecipeModalProps {
  onClose: () => void;
  onSave: (recipe: Recipe) => Promise<boolean> | any;
}

export default function CreateRecipeModal({ onClose, onSave }: CreateRecipeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Partial<Recipe>>({
    title: '',
    description: '',
    prepTime: '',
    calories: 0,
    estimatedCost: 0,
    budget: 'Moderate',
    difficulty: 'Medium',
    ingredients: [''],
    instructions: [''],
    tags: [],
    image: '',
    nutrients: { protein: '0g', carbs: '0g', fat: '0g' }
  });

  const handleAddIngredient = () => {
    setRecipe(r => ({ ...r, ingredients: [...(r.ingredients || []), ''] }));
  };

  const handleAddInstruction = () => {
    setRecipe(r => ({ ...r, instructions: [...(r.instructions || []), ''] }));
  };

  const handleIngredientChange = (index: number, value: string) => {
    const newIngs = [...(recipe.ingredients || [])];
    newIngs[index] = value;
    setRecipe({ ...recipe, ingredients: newIngs });
  };

  const handleInstructionChange = (index: number, value: string) => {
    const newInst = [...(recipe.instructions || [])];
    newInst[index] = value;
    setRecipe({ ...recipe, instructions: newInst });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic Validation
    if (!recipe.title || recipe.title.trim().length < 3) {
        setError('Recipe title must be at least 3 characters long.');
        return;
    }

    if (!recipe.description || recipe.description.trim().length < 10) {
        setError('Please provide a more descriptive summary (min 10 characters).');
        return;
    }

    const validIngredients = recipe.ingredients?.filter(i => i.trim().length > 0) || [];
    if (validIngredients.length < 2) {
        setError('Please add at least 2 ingredients.');
        return;
    }

    const validInstructions = recipe.instructions?.filter(i => i.trim().length > 0) || [];
    if (validInstructions.length < 1) {
        setError('Please add at least one step for the instructions.');
        return;
    }

    if ((recipe.calories || 0) <= 0) {
        setError('Calories must be a positive number.');
        return;
    }

    setLoading(true);
    try {
      let finalImageUrl = recipe.image;
      if (!finalImageUrl) {
        finalImageUrl = await generateRecipeImage(recipe.title || 'Delicious Meal');
      }
      
      const newRecipe: Recipe = {
        ...recipe as Recipe,
        id: Math.random().toString(36).substr(2, 9),
        ingredients: validIngredients,
        instructions: validInstructions,
        image: finalImageUrl || '',
        tags: [...(recipe.tags || []), 'User Created']
      };
      const success = await onSave(newRecipe);
      if (success !== false) {
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-brand-ink/60"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-brand-cream w-full max-w-3xl max-h-[90vh] rounded-[40px] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-8 border-b border-black/5 flex justify-between items-center bg-white dark:bg-brand-ink/40">
          <h2 className="text-3xl font-serif">Post Your Recipe</h2>
          <button onClick={onClose} className="p-2 hover:bg-brand-cream dark:hover:bg-brand-ink/20 rounded-full transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 overflow-y-auto flex-1 space-y-8">
          {error && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="p-4 bg-red-50 text-red-600 rounded-2xl flex items-center gap-3 text-sm font-bold border border-red-100"
            >
              <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <X size={14} />
              </div>
              {error}
            </motion.div>
          )}

          <div className="space-y-4">
            <label className="block text-base font-bold uppercase tracking-widest text-brand-ink">Recipe Title</label>
            <input 
              autoFocus
              required
              type="text" 
              placeholder="e.g. Grandma's Secret Adobo"
              className="w-full p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
              value={recipe.title}
              onKeyDown={e => e.stopPropagation()}
              onChange={e => setRecipe({ ...recipe, title: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <label className="block text-base font-bold uppercase tracking-widest text-brand-ink">Description</label>
            <textarea 
              required
              placeholder="Tell us about your dish..."
              className="w-full p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none min-h-[100px] focus:border-brand-olive/30 transition-all"
              value={recipe.description}
              onKeyDown={e => e.stopPropagation()}
              onChange={e => setRecipe({ ...recipe, description: e.target.value })}
            />
          </div>

          <div className="space-y-4">
            <label className="block text-base font-bold uppercase tracking-widest text-brand-ink">Image URL (Optional)</label>
            <input 
              type="url" 
              placeholder="https://example.com/my-dish.jpg (Leave empty for AI generation)"
              className="w-full p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
              value={recipe.image}
              onChange={e => setRecipe({ ...recipe, image: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-4">
              <label className="block text-base font-bold uppercase tracking-widest text-brand-ink">Prep Time</label>
              <input 
                required
                type="text" 
                placeholder="e.g. 45 mins"
                className="w-full p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                value={recipe.prepTime}
                onChange={e => setRecipe({ ...recipe, prepTime: e.target.value })}
              />
            </div>
            <div className="space-y-4">
              <label className="block text-base font-bold uppercase tracking-widest text-brand-ink">Calories</label>
              <input 
                required
                type="number" 
                placeholder="0"
                className="w-full p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                value={recipe.calories || ''}
                onChange={e => setRecipe({ ...recipe, calories: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="space-y-4">
              <label className="block text-base font-bold uppercase tracking-widest text-brand-ink">Est. Cost (PHP)</label>
              <input 
                required
                type="number" 
                placeholder="0"
                className="w-full p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                value={recipe.estimatedCost || ''}
                onChange={e => setRecipe({ ...recipe, estimatedCost: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-base font-bold uppercase tracking-widest text-brand-ink">Ingredients</label>
              <button type="button" onClick={handleAddIngredient} className="text-brand-olive flex items-center gap-1 text-base font-bold">
                <Plus size={16} /> Add
              </button>
            </div>
            {recipe.ingredients?.map((ing, i) => (
              <div key={i} className="flex gap-2">
                <input 
                  required
                  type="text" 
                  placeholder={`Ingredient ${i + 1}`}
                  className="flex-1 p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                  value={ing}
                  onChange={e => handleIngredientChange(i, e.target.value)}
                />
                {i > 0 && (
                  <button type="button" onClick={() => setRecipe({ ...recipe, ingredients: recipe.ingredients?.filter((_, idx) => idx !== i) })} className="text-red-400 p-2">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="block text-base font-bold uppercase tracking-widest text-brand-ink">Instructions</label>
              <button type="button" onClick={handleAddInstruction} className="text-brand-olive flex items-center gap-1 text-base font-bold">
                <Plus size={16} /> Add
              </button>
            </div>
            {recipe.instructions?.map((inst, i) => (
              <div key={i} className="flex gap-2">
                <textarea 
                  required
                  placeholder={`Step ${i + 1}`}
                  className="flex-1 p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                  value={inst}
                  onChange={e => handleInstructionChange(i, e.target.value)}
                />
                {i > 0 && (
                  <button type="button" onClick={() => setRecipe({ ...recipe, instructions: recipe.instructions?.filter((_, idx) => idx !== i) })} className="text-red-400 p-2">
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <button 
            disabled={loading}
            type="submit" 
            className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                Generating AI Photo...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Post Recipe
              </>
            )}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
