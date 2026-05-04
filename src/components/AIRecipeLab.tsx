import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences, Recipe, DietPreference, BudgetLevel } from '../types';
import { generateRecipes } from '../services/geminiService';
import { Sparkles, Loader2, ChefHat, Flame, Utensils, Zap, Filter, Search, X } from 'lucide-react';
import RecipeCard from './RecipeCard';
import { RecipeCardSkeleton } from './ui/Skeleton';

interface AIRecipeLabProps {
  initialPreferences: UserPreferences;
  onSaveRecipe: (recipe: Recipe) => void;
  favorites: string[];
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
  onRecipeClick: (recipe: Recipe) => void;
  onNotify?: (title: string, message: string, type: any) => void;
  onRate?: (recipeId: string, rating: number) => void;
}

const DIETS: DietPreference[] = ['Keto', 'Vegan', 'Vegetarian', 'High Protein', 'High Carbs'];
const BUDGETS: BudgetLevel[] = ['Budget', 'Moderate', 'Premium'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Any'];
const CUISINES = ['Filipino', 'Italian', 'Mexican', 'Japanese', 'Indian', 'Mediterranean', 'Thai', 'American', 'French', 'Chinese', 'Korean', 'Middle Eastern', 'Spanish', 'Greek', 'Vietnamese'];

export default function AIRecipeLab({ initialPreferences, onSaveRecipe, favorites, onToggleFavorite, onRecipeClick, onNotify, onRate }: AIRecipeLabProps) {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Recipe[]>([]);
  const [prefs, setPrefs] = useState<UserPreferences>(initialPreferences);
  const [customCuisine, setCustomCuisine] = useState('');
  const [allergiesInput, setAllergiesInput] = useState(initialPreferences.allergies.join(', '));

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const finalPrefs = {
        ...prefs,
        cuisines: customCuisine ? [...prefs.cuisines, customCuisine] : prefs.cuisines
      };
      const generated = await generateRecipes(finalPrefs, true);
      setResults(generated);
      onNotify?.('Experiment Successful', 'New culinary data has been synthesized.', 'recipe_ready');
    } catch (error: any) {
      console.error("AI Generation failed:", error);
      onNotify?.('Reactor Malfunction', error.message || 'Synthesis failed. Please wait for the system to cool down.', 'system');
    } finally {
      setLoading(false);
    }
  };

  const toggleCuisine = (c: string) => {
    setPrefs(p => ({
      ...p,
      cuisines: p.cuisines.includes(c) 
        ? p.cuisines.filter(x => x !== c) 
        : [...p.cuisines, c]
    }));
  };

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar Controls */}
        <div className="md:w-1/3 space-y-8 bg-white/50 dark:bg-brand-ink/20 p-8 rounded-[32px] border border-black/5 dark:border-white/5 h-fit backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-brand-olive/10 rounded-full flex items-center justify-center text-brand-olive">
              <Zap size={20} fill="currentColor" />
            </div>
            <h2 className="text-2xl font-serif">Recipe Lab</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Meal Type</label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TYPES.map(type => (
                  <button
                    key={type}
                    onClick={() => setPrefs({ ...prefs, mealType: type as any })}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                      prefs.mealType === type || (!prefs.mealType && type === 'Any')
                        ? 'bg-brand-olive text-white border-brand-olive shadow-lg shadow-brand-olive/20' 
                        : 'bg-white dark:bg-brand-ink/10 border-black/5 dark:border-white/10 hover:border-brand-olive/30'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Dietary Theme</label>
              <div className="flex flex-wrap gap-2">
                {DIETS.map(diet => (
                  <button
                    key={diet}
                    onClick={() => setPrefs({ ...prefs, diet })}
                    className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                      prefs.diet === diet 
                        ? 'bg-brand-olive text-white border-brand-olive shadow-lg shadow-brand-olive/20' 
                        : 'bg-white dark:bg-brand-ink/10 border-black/5 dark:border-white/10 hover:border-brand-olive/30'
                    }`}
                  >
                    {diet}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-4">
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle">Calorie Goal</label>
                <div className="px-3 py-1 bg-brand-olive text-white rounded-full text-[10px] font-bold">
                  {prefs.calorieGoal || 500} kcal
                </div>
              </div>
              <input 
                type="range" 
                min="100" 
                max="1200" 
                step="50"
                value={prefs.calorieGoal || 500}
                onChange={(e) => setPrefs({ ...prefs, calorieGoal: parseInt(e.target.value) })}
                className="w-full accent-brand-olive cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-[10px] font-bold text-brand-ink-subtle uppercase tracking-tighter">
                <span>Light</span>
                <span>Balanced</span>
                <span>Hearty</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Budget Range</label>
              <div className="grid grid-cols-3 gap-2">
                {BUDGETS.map(b => (
                  <button
                    key={b}
                    onClick={() => setPrefs({ ...prefs, budget: b })}
                    className={`p-3 rounded-xl text-xs font-bold transition-all border ${
                      prefs.budget === b 
                        ? 'bg-brand-olive text-white border-brand-olive shadow-lg shadow-brand-olive/20' 
                        : 'bg-white dark:bg-brand-ink/10 border-black/5 dark:border-white/10 hover:border-brand-olive/30'
                    }`}
                  >
                    {b === 'Moderate' ? 'Regular' : b}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Desired Cuisines</label>
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                {CUISINES.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCuisine(c)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border ${
                      prefs.cuisines.includes(c)
                        ? 'bg-brand-olive text-white border-brand-olive'
                        : 'bg-white dark:bg-brand-ink/10 border-black/5 dark:border-white/10'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Allergies/Restrictions</label>
              <input 
                type="text"
                placeholder="e.g. Peanuts, Dairy..."
                className="w-full p-4 bg-white dark:bg-brand-ink/10 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 text-sm"
                value={allergiesInput}
                onKeyDown={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setAllergiesInput(e.target.value);
                  setPrefs({ ...prefs, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) });
                }}
              />
            </div>

            <button 
              onClick={handleGenerate}
              disabled={loading}
              className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 mt-4"
            >
              {loading ? <Loader2 size={24} className="animate-spin" /> : <Sparkles size={24} />}
              Generate Recipes
            </button>
          </div>
        </div>

        {/* Results Area */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            {loading ? (
              <motion.div 
                key="loading-lab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {[...Array(4)].map((_, i) => <RecipeCardSkeleton key={i} />)}
              </motion.div>
            ) : results.length > 0 ? (
              <motion.div 
                key="results-lab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
              >
                {results.map((recipe, idx) => (
                  <motion.div
                    key={recipe.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <RecipeCard 
                      recipe={recipe} 
                      onClick={onRecipeClick} 
                      isFavorite={favorites.includes(recipe.id)}
                      onToggleFavorite={(e) => onToggleFavorite(e, recipe.id)}
                      onRate={onRate}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div 
                key="empty-lab"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center py-32 bg-white/20 dark:bg-brand-ink/5 rounded-[40px] border-2 border-dashed border-black/5 dark:border-white/5 text-center px-12"
              >
                <div className="w-20 h-20 bg-brand-clay/10 rounded-full flex items-center justify-center mb-8">
                  <Filter size={32} className="text-brand-clay" />
                </div>
                <h3 className="text-3xl font-serif mb-4">Laboratory Idle</h3>
                <p className="text-brand-ink-muted max-w-md mx-auto">Adjust the parameters on the left and hit generate to begin your custom AI recipe experiment. Your culinary journey starts here.</p>
                <div className="mt-12 flex gap-4 opacity-30 select-none">
                  <Utensils size={32} />
                  <Flame size={32} />
                  <ChefHat size={32} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
