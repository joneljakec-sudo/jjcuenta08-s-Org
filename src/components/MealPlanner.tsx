import React, { useState, useEffect } from 'react';
import { Recipe, MealPlan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Utensils, Clock, Trash2, CheckCircle2, Package, Archive, Repeat, ChefHat } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { generateRecipes } from '../services/geminiService';
import { Skeleton } from './ui/Skeleton';

interface MealPlannerProps {
  userRecipes: Recipe[];
  favorites: Recipe[];
  onRecipeClick: (recipe: Recipe) => void;
  userId: string;
}

export default function MealPlanner({ userRecipes, favorites, onRecipeClick, userId }: MealPlannerProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [isAddingMeal, setIsAddingMeal] = useState<{ date: string; type: MealPlan['meal_type'] } | null>(null);
  const [isEditingMeal, setIsEditingMeal] = useState<MealPlan | null>(null);
  const [quickMealTitle, setQuickMealTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const mealTypes: MealPlan['meal_type'][] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

  useEffect(() => {
    fetchMealPlans();
  }, [userId]);

  const fetchMealPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;
      setMealPlans(data || []);
    } catch (err) {
      console.error('Error fetching meal plans:', err);
    } finally {
      setLoading(false);
    }
  };

  const addMeal = async (recipe: Recipe) => {
    if (!isAddingMeal && !isEditingMeal) return;

    try {
      if (isEditingMeal) {
        const { data, error } = await supabase
          .from('meal_plans')
          .update({
            recipe_id: recipe.id,
            recipe_title: recipe.title,
            recipe_image: recipe.image
          })
          .eq('id', isEditingMeal.id)
          .select()
          .single();

        if (error) {
          setMealPlans(prev => prev.map(p => p.id === isEditingMeal.id ? {
            ...p,
            recipe_id: recipe.id,
            recipe_title: recipe.title,
            recipe_image: recipe.image
          } : p));
        } else {
          setMealPlans(prev => prev.map(p => p.id === isEditingMeal.id ? data : p));
        }
        setIsEditingMeal(null);
        return;
      }

      const newPlan: Omit<MealPlan, 'id'> = {
        user_id: userId,
        recipe_id: recipe.id,
        recipe_title: recipe.title,
        recipe_image: recipe.image,
        date: isAddingMeal.date,
        meal_type: isAddingMeal.type
      };

      const { data, error } = await supabase
        .from('meal_plans')
        .insert(newPlan)
        .select()
        .single();

      if (error) {
        // Fallback for guest or if table missing
        const fallbackId = Math.random().toString(36).substr(2, 9);
        const fallbackData = { ...newPlan, id: fallbackId } as MealPlan;
        setMealPlans(prev => [...prev, fallbackData]);
      } else {
        setMealPlans(prev => [...prev, data]);
      }
      setIsAddingMeal(null);
      setQuickMealTitle('');
    } catch (err) {
      console.error('Error adding meal:', err);
    }
  };

  const addQuickMeal = async () => {
    if ((!isAddingMeal && !isEditingMeal) || !quickMealTitle.trim()) return;

    try {
      if (isEditingMeal) {
        const { data, error } = await supabase
          .from('meal_plans')
          .update({
            recipe_title: quickMealTitle.trim(),
            recipe_image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&q=80&w=400'
          })
          .eq('id', isEditingMeal.id)
          .select()
          .single();

        if (error) {
          setMealPlans(prev => prev.map(p => p.id === isEditingMeal.id ? {
            ...p,
            recipe_title: quickMealTitle.trim(),
            recipe_image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&q=80&w=400'
          } : p));
        } else {
          setMealPlans(prev => prev.map(p => p.id === isEditingMeal.id ? data : p));
        }
        setIsEditingMeal(null);
        setQuickMealTitle('');
        return;
      }

      const newPlan: Omit<MealPlan, 'id'> = {
        user_id: userId,
        recipe_id: `quick-${Math.random().toString(36).substr(2, 5)}`,
        recipe_title: quickMealTitle.trim(),
        recipe_image: 'https://images.unsplash.com/photo-1490818387583-1baba5e638af?auto=format&fit=crop&q=80&w=400',
        date: isAddingMeal.date,
        meal_type: isAddingMeal.type
      };

      const { data, error } = await supabase
        .from('meal_plans')
        .insert(newPlan)
        .select()
        .single();

      if (error) {
        const fallbackId = Math.random().toString(36).substr(2, 9);
        const fallbackData = { ...newPlan, id: fallbackId } as MealPlan;
        setMealPlans(prev => [...prev, fallbackData]);
      } else {
        setMealPlans(prev => [...prev, data]);
      }
      setIsAddingMeal(null);
      setQuickMealTitle('');
    } catch (err) {
      console.error('Error adding quick meal:', err);
    }
  };

  const removeMeal = async (id: string) => {
    try {
      await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id);

      setMealPlans(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error removing meal:', err);
    }
  };

  const swapMeal = async (meal: MealPlan) => {
    try {
      setLoading(true);
      // Fetch user prefs from profiles to ensure we have latest for generation
      const { data: profile } = await supabase.from('profiles').select('preferences').eq('id', userId).single();
      const userPrefs = profile?.preferences || { diet: 'Moderate' as any, budget: 'Moderate' as any, allergies: [], cuisines: [] };
      
      const suggested = await generateRecipes({ 
        ...userPrefs, 
        mealType: meal.meal_type as any 
      });
      
      if (suggested && suggested.length > 0) {
        const newRecipe = suggested[0];
        
        const { data, error } = await supabase
          .from('meal_plans')
          .update({
            recipe_id: newRecipe.id,
            recipe_title: newRecipe.title,
            recipe_image: newRecipe.image,
            is_meal_prep: false
          })
          .eq('id', meal.id)
          .select()
          .single();

        if (error) {
          setMealPlans(prev => prev.map(p => p.id === meal.id ? { 
            ...p, 
            recipe_id: newRecipe.id, 
            recipe_title: newRecipe.title, 
            recipe_image: newRecipe.image,
            is_meal_prep: false
          } : p));
        } else {
          setMealPlans(prev => prev.map(p => p.id === meal.id ? data : p));
        }
      }
    } catch (err) {
      console.error('Error swapping meal:', err);
    } finally {
      setLoading(false);
    }
  };

  const changeMealType = async (type: MealPlan['meal_type']) => {
    if (!isEditingMeal) return;
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .update({ meal_type: type })
        .eq('id', isEditingMeal.id)
        .select()
        .single();
      
      if (error) {
        setMealPlans(prev => prev.map(p => p.id === isEditingMeal.id ? { ...p, meal_type: type } : p));
      } else {
        setMealPlans(prev => prev.map(p => p.id === isEditingMeal.id ? data : p));
      }
      setIsEditingMeal(prev => prev ? { ...prev, meal_type: type } : null);
    } catch (err) {
      console.error('Error changing meal type:', err);
    }
  };

  const changeMealDate = async (date: string) => {
    if (!isEditingMeal) return;
    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .update({ date })
        .eq('id', isEditingMeal.id)
        .select()
        .single();
      
      if (error) {
        setMealPlans(prev => prev.map(p => p.id === isEditingMeal.id ? { ...p, date } : p));
      } else {
        setMealPlans(prev => prev.map(p => p.id === isEditingMeal.id ? data : p));
      }
      setIsEditingMeal(prev => prev ? { ...prev, date } : null);
    } catch (err) {
      console.error('Error changing meal date:', err);
    }
  };

  const toggleMealPrep = async (meal: MealPlan) => {
    try {
      await supabase
        .from('meal_plans')
        .update({ is_meal_prep: !meal.is_meal_prep })
        .eq('id', meal.id);

      setMealPlans(prev => prev.map(p => p.id === meal.id ? { ...p, is_meal_prep: !p.is_meal_prep } : p));
    } catch (err) {
      console.error('Error toggling meal prep:', err);
    }
  };

  const getWeekDays = () => {
    const start = new Date(currentDate);
    start.setDate(start.getDate() - start.getDay());
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  };

  const weekDays = getWeekDays();

  const getMealsForDayAndType = (date: Date, type: MealPlan['meal_type']) => {
    const dateString = date.toISOString().split('T')[0];
    return mealPlans.filter(p => p.date === dateString && p.meal_type === type);
  };

  const [pickerTab, setPickerTab] = useState<'my-recipes' | 'favorites'>('my-recipes');
  const [aiGenerating, setAiGenerating] = useState(false);

  const suggestAiMeal = async (type: MealPlan['meal_type'], date: string) => {
    try {
      setAiGenerating(true);
      const { data: profile } = await supabase.from('profiles').select('preferences').eq('id', userId).single();
      const userPrefs = profile?.preferences || { diet: 'Moderate' as any, budget: 'Moderate' as any, allergies: [], cuisines: [] };
      
      const suggested = await generateRecipes({ 
        ...userPrefs, 
        mealType: type as any 
      });
      
      if (suggested && suggested.length > 0) {
        const recipe = suggested[0];
        const newPlan: Omit<MealPlan, 'id'> = {
          user_id: userId,
          recipe_id: recipe.id,
          recipe_title: recipe.title,
          recipe_image: recipe.image,
          date,
          meal_type: type
        };

        const { data, error } = await supabase
          .from('meal_plans')
          .insert(newPlan)
          .select()
          .single();

        if (error) {
          setMealPlans(prev => [...prev, { ...newPlan, id: Math.random().toString(36).substr(2, 9) } as MealPlan]);
        } else {
          setMealPlans(prev => [...prev, data]);
        }
        setIsAddingMeal(null);
      }
    } catch (err) {
      console.error('Error suggesting AI meal:', err);
    } finally {
      setAiGenerating(false);
    }
  };

  const availableRecipes = pickerTab === 'my-recipes' ? userRecipes : favorites;

  const preppedMeals = mealPlans.filter(p => p.is_meal_prep);

  if (loading && mealPlans.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-4">
            <Skeleton variant="text" className="w-64 h-12" />
            <Skeleton variant="text" className="w-48 h-6" />
          </div>
          <Skeleton variant="rectangular" className="w-64 h-16 rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {[...Array(7)].map((_, i) => (
            <div key={i} className="space-y-4">
              <Skeleton variant="rectangular" className="w-full h-24 rounded-3xl" />
              {[...Array(3)].map((_, j) => (
                <div key={j} className="space-y-2">
                  <Skeleton variant="text" className="w-12 h-3" />
                  <Skeleton variant="rectangular" className="w-full h-20 rounded-2xl" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-serif font-bold text-brand-ink mb-2">Meal <span className="text-brand-olive italic">Planner</span></h1>
          <p className="text-brand-ink-muted text-lg">Schedule your weekly nourishment.</p>
        </div>

        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {preppedMeals.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-olive/5 rounded-2xl border border-brand-olive/10">
              <Package size={18} className="text-brand-olive" />
              <span className="text-xs font-bold text-brand-olive uppercase tracking-widest">{preppedMeals.length} Prepped</span>
            </div>
          )}
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-white dark:bg-brand-ink/10 border border-black/5 dark:border-white/5 rounded-2xl text-xs font-bold uppercase tracking-widest text-brand-ink-subtle hover:text-brand-ink hover:bg-brand-olive/5 transition-all"
            >
              Today
            </button>
            
            <div className="flex items-center gap-2 bg-white dark:bg-brand-ink/10 p-1.5 rounded-2xl border border-black/5 dark:border-white/5">
              <button 
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() - 7);
                  setCurrentDate(d);
                }}
                className="p-2 hover:bg-brand-olive/10 rounded-xl transition-all text-brand-ink-subtle hover:text-brand-olive"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="flex items-center gap-2 px-4 font-bold text-sm min-w-[200px] justify-center text-brand-ink-muted">
                <CalendarIcon size={16} className="text-brand-olive" />
                {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </div>
              <button 
                onClick={() => {
                  const d = new Date(currentDate);
                  d.setDate(d.getDate() + 7);
                  setCurrentDate(d);
                }}
                className="p-2 hover:bg-brand-olive/10 rounded-xl transition-all text-brand-ink-subtle hover:text-brand-olive"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {weekDays.map((day, idx) => {
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={idx} className="flex flex-col gap-4">
              <div className={`p-4 rounded-3xl text-center border-2 transition-all ${isToday ? 'bg-brand-olive border-brand-olive shadow-xl shadow-brand-olive/20' : 'bg-white dark:bg-brand-ink/5 border-black/5 dark:border-white/5'}`}>
                <div className={`text-xs font-bold uppercase tracking-widest ${isToday ? 'text-white/70' : 'text-brand-ink-subtle'}`}>{daysOfWeek[day.getDay()]}</div>
                <div className={`text-3xl font-bold font-serif ${isToday ? 'text-white' : 'text-brand-ink'}`}>{day.getDate()}</div>
              </div>

              <div className="space-y-4">
                {mealTypes.map(type => {
                  const dayMeals = getMealsForDayAndType(day, type);
                  return (
                    <div key={type} className="group relative">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink-subtle">{type}</span>
                        <button 
                          onClick={() => setIsAddingMeal({ date: day.toISOString().split('T')[0], type })}
                          className="p-1 hover:bg-brand-olive/10 rounded-lg text-brand-olive transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <div className="space-y-2">
                        {dayMeals.map(meal => (
                          <motion.div 
                            key={meal.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative group/meal"
                          >
                            <div 
                              onClick={() => {
                                setIsEditingMeal(meal);
                                setQuickMealTitle(meal.recipe_title);
                              }}
                              className={`bg-white dark:bg-brand-card p-3 rounded-2xl shadow-sm border transition-all cursor-pointer ${
                                meal.is_meal_prep 
                                  ? 'border-brand-olive ring-2 ring-brand-olive/20' 
                                  : 'border-black/5 dark:border-white/5'
                              } group-hover/meal:border-brand-olive/30`}
                            >
                              <div className="aspect-video rounded-xl overflow-hidden mb-3 relative">
                                <img src={meal.recipe_image} alt={meal.recipe_title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                {meal.is_meal_prep && (
                                  <div className="absolute top-2 left-2 px-2 py-1 bg-brand-olive text-white text-[8px] font-bold uppercase tracking-widest rounded-lg flex items-center gap-1 shadow-lg">
                                    <CheckCircle2 size={8} /> Prepped
                                  </div>
                                )}
                              </div>
                              <h4 className="text-xs font-bold text-brand-ink leading-tight line-clamp-2">{meal.recipe_title}</h4>
                            </div>
                            <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover/meal:opacity-100 transition-all z-10">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMealPrep(meal);
                                }}
                                className={`p-1.5 rounded-full shadow-lg hover:scale-110 transition-all ${
                                  meal.is_meal_prep ? 'bg-brand-olive text-white' : 'bg-white text-brand-ink hover:bg-brand-olive hover:text-white'
                                }`}
                                title={meal.is_meal_prep ? "Unmark Meal Prep" : "Mark as Meal Prep"}
                              >
                                <Package size={10} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  swapMeal(meal);
                                }}
                                className="p-1.5 bg-brand-olive text-white rounded-full shadow-lg hover:scale-110 transition-all"
                                title="Swap with AI Recommendation"
                                disabled={loading}
                              >
                                <Repeat size={10} className={loading ? 'animate-spin' : ''} />
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeMeal(meal.id);
                                }}
                                className="p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:scale-110 transition-all"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </motion.div>
                        ))}

                        {dayMeals.length === 0 && (
                          <button 
                            onClick={() => setIsAddingMeal({ date: day.toISOString().split('T')[0], type })}
                            className="w-full aspect-video rounded-2xl border-2 border-dashed border-black/5 dark:border-white/5 flex items-center justify-center text-brand-ink-subtle hover:border-brand-olive/30 hover:text-brand-olive transition-all group-hover:bg-brand-olive/5"
                          >
                            <Plus size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {preppedMeals.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-16"
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="p-3 bg-brand-olive/10 rounded-2xl text-brand-olive">
              <Archive size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-serif font-bold">Meal Prep <span className="text-brand-olive italic">Inventory</span></h2>
              <p className="text-brand-ink-muted">Recipes you've prepared in advance.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {preppedMeals.map(meal => (
              <div 
                key={`${meal.id}-inventory`}
                onClick={() => {
                  const recipe = availableRecipes.find(r => r.id === meal.recipe_id);
                  if (recipe) onRecipeClick(recipe);
                }}
                className="bg-white dark:bg-brand-card p-4 rounded-[32px] border border-black/5 dark:border-white/5 hover:border-brand-olive/30 transition-all cursor-pointer group hover:shadow-xl"
              >
                <div className="aspect-square rounded-2xl overflow-hidden mb-4 relative">
                  <img src={meal.recipe_image} alt={meal.recipe_title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Utensils className="text-white" size={24} />
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-brand-olive/10 text-brand-olive text-[8px] font-bold uppercase tracking-widest rounded-full">
                    {meal.meal_type}
                  </span>
                  <span className="text-[8px] font-bold text-brand-ink-subtle uppercase tracking-widest">
                    {new Date(meal.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h4 className="text-sm font-bold text-brand-ink leading-tight line-clamp-2">{meal.recipe_title}</h4>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {(isAddingMeal || isEditingMeal) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-brand-ink/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-brand-cream dark:bg-brand-card w-full max-w-2xl max-h-[80vh] rounded-[40px] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-serif">
                    {isEditingMeal ? 'Edit' : 'Add to'} {isEditingMeal ? isEditingMeal.meal_type : isAddingMeal?.type}
                  </h3>
                  <p className="text-brand-ink-subtle italic">
                    {isEditingMeal ? 'Modify your meal plan' : 'Pick a recipe from your kitchen'}
                  </p>
                </div>
                <button onClick={() => {
                  setIsAddingMeal(null);
                  setIsEditingMeal(null);
                  setQuickMealTitle('');
                }} className="p-3 hover:bg-black/5 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
                {isEditingMeal && (
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-2">Meal Type</label>
                      <select 
                        value={isEditingMeal.meal_type}
                        onChange={(e) => changeMealType(e.target.value as MealPlan['meal_type'])}
                        className="w-full p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none"
                      >
                        {mealTypes.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-2">Date</label>
                      <input 
                        type="date"
                        value={isEditingMeal.date}
                        onChange={(e) => changeMealDate(e.target.value)}
                        className="w-full p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none"
                      />
                    </div>
                  </div>
                )}

                <div className="mb-8 p-6 bg-white dark:bg-brand-ink/10 rounded-3xl border-2 border-brand-olive/20 shadow-inner">
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-3">
                    {isEditingMeal ? 'Change Meal Title' : 'Quick Add Meal'}
                  </label>
                  <div className="flex gap-3">
                    <input 
                      autoFocus
                      type="text"
                      placeholder="What are you eating? (e.g. Scrambled Eggs)"
                      className="flex-1 p-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                      value={quickMealTitle}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter') addQuickMeal();
                      }}
                      onChange={(e) => setQuickMealTitle(e.target.value)}
                    />
                    <button 
                      onClick={addQuickMeal}
                      disabled={!quickMealTitle.trim()}
                      className="bg-brand-olive text-white p-4 rounded-2xl disabled:opacity-50 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-brand-olive/20"
                    >
                      {isEditingMeal ? <CheckCircle2 size={24} /> : <Plus size={24} />}
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 mb-8">
                  <div className="flex-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl flex gap-1">
                    <button 
                      onClick={() => setPickerTab('my-recipes')}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${pickerTab === 'my-recipes' ? 'bg-white dark:bg-brand-card shadow-sm text-brand-ink' : 'text-brand-ink-subtle hover:text-brand-ink'}`}
                    >
                      My Kitchen
                    </button>
                    <button 
                      onClick={() => setPickerTab('favorites')}
                      className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${pickerTab === 'favorites' ? 'bg-white dark:bg-brand-card shadow-sm text-brand-ink' : 'text-brand-ink-subtle hover:text-brand-ink'}`}
                    >
                      Favorites
                    </button>
                  </div>
                  {!isEditingMeal && isAddingMeal && (
                    <button 
                      onClick={() => suggestAiMeal(isAddingMeal.type, isAddingMeal.date)}
                      disabled={aiGenerating}
                      className="flex-1 py-3 px-4 bg-brand-olive text-white rounded-2xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-brand-olive/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 "
                    >
                      {aiGenerating ? (
                        <>
                          <Repeat size={14} className="animate-spin" />
                          Curating...
                        </>
                      ) : (
                        <>
                          <ChefHat size={14} />
                          AI Suggest
                        </>
                      )}
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4 mb-6">
                  <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-brand-ink-subtle">
                    {isEditingMeal ? 'Or swap for a recipe' : `Choose from ${pickerTab === 'my-recipes' ? 'your kitchen' : 'favorites'}`}
                  </span>
                  <div className="flex-1 h-px bg-black/5 dark:bg-white/5" />
                </div>

                {isEditingMeal && (
                  <div className="mb-8">
                    <button
                      onClick={() => {
                        const recipe = availableRecipes.find(r => r.id === isEditingMeal.recipe_id);
                        if (recipe) onRecipeClick(recipe);
                        setIsEditingMeal(null);
                      }}
                      className="w-full p-4 bg-brand-olive/10 text-brand-olive rounded-2xl font-bold hover:bg-brand-olive/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Utensils size={18} /> View Recipe Details
                    </button>
                  </div>
                )}

                {availableRecipes.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-xl text-brand-ink-muted italic mb-4">No recipes in your kitchen yet.</p>
                    <p className="text-sm">Save some favorites or create your own to plan your meals!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableRecipes.map(recipe => (
                      <button
                        key={recipe.id}
                        onClick={() => addMeal(recipe)}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-brand-ink/10 border border-black/5 dark:border-white/5 hover:border-brand-olive/30 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                        </div>
                        <div>
                          <h4 className="font-bold text-brand-ink mb-1 line-clamp-1">{recipe.title}</h4>
                          <div className="flex items-center gap-3 text-[10px] text-brand-ink-subtle uppercase tracking-widest font-bold">
                            <span className="flex items-center gap-1"><Clock size={10} /> {recipe.prepTime}</span>
                            <span className="flex items-center gap-1"><Utensils size={10} /> {recipe.difficulty}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
