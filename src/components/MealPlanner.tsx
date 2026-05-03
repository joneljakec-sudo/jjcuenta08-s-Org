import React, { useState, useEffect } from 'react';
import { Recipe, MealPlan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, X, Utensils, Clock, Trash2, CheckCircle2, Package, Archive } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
    if (!isAddingMeal) return;

    try {
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

      if (error) throw error;
      setMealPlans(prev => [...prev, data]);
      setIsAddingMeal(null);
    } catch (err) {
      console.error('Error adding meal:', err);
    }
  };

  const removeMeal = async (id: string) => {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMealPlans(prev => prev.filter(p => p.id !== id));
    } catch (err) {
      console.error('Error removing meal:', err);
    }
  };

  const toggleMealPrep = async (meal: MealPlan) => {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .update({ is_meal_prep: !meal.is_meal_prep })
        .eq('id', meal.id);

      if (error) throw error;
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

  const availableRecipes = Array.from(new Map([...userRecipes, ...favorites].map(r => [r.id, r])).values());

  const preppedMeals = mealPlans.filter(p => p.is_meal_prep);

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-5xl font-serif font-bold text-brand-ink mb-2">Meal <span className="text-brand-olive italic">Planner</span></h1>
          <p className="text-brand-ink-muted text-lg">Schedule your weekly nourishment.</p>
        </div>

        <div className="flex items-center gap-6">
          {preppedMeals.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 bg-brand-olive/5 rounded-2xl border border-brand-olive/10">
              <Package size={18} className="text-brand-olive" />
              <span className="text-sm font-bold text-brand-olive">{preppedMeals.length} Prepped</span>
            </div>
          )}

          <div className="flex items-center gap-4 bg-white dark:bg-brand-ink/10 p-2 rounded-2xl border border-black/5 dark:border-white/10">
          <button 
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() - 7);
              setCurrentDate(d);
            }}
            className="p-2 hover:bg-brand-olive/10 rounded-xl transition-all"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="flex items-center gap-3 px-4 font-bold text-lg min-w-[240px] justify-center">
            <CalendarIcon size={20} className="text-brand-olive" />
            {weekDays[0].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </div>
          <button 
            onClick={() => {
              const d = new Date(currentDate);
              d.setDate(d.getDate() + 7);
              setCurrentDate(d);
            }}
            className="p-2 hover:bg-brand-olive/10 rounded-xl transition-all"
          >
            <ChevronRight size={24} />
          </button>
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
                                const recipe = availableRecipes.find(r => r.id === meal.recipe_id);
                                if (recipe) onRecipeClick(recipe);
                              }}
                              className={`bg-white dark:bg-brand-card p-3 rounded-2xl shadow-sm border transition-all cursor-pointer ${
                                meal.is_meal_prep 
                                  ? 'border-brand-olive ring-2 ring-brand-olive/20' 
                                  : 'border-black/5 dark:border-white/5'
                              } group-hover/meal:border-brand-olive/30`}
                            >
                              <div className="aspect-video rounded-xl overflow-hidden mb-3 relative">
                                <img src={meal.recipe_image} alt={meal.recipe_title} className="w-full h-full object-cover" />
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
                  <img src={meal.recipe_image} alt={meal.recipe_title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
        {isAddingMeal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-ink/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-brand-cream dark:bg-brand-card w-full max-w-2xl max-h-[80vh] rounded-[40px] overflow-hidden flex flex-col shadow-2xl"
            >
              <div className="p-8 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-serif">Add to {isAddingMeal.type}</h3>
                  <p className="text-brand-ink-subtle italic">Pick a recipe from your kitchen</p>
                </div>
                <button onClick={() => setIsAddingMeal(null)} className="p-3 hover:bg-black/5 rounded-full transition-all">
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 overflow-y-auto">
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
                          <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
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
