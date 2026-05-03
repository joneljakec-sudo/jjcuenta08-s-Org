import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPreferences, DietPreference, BudgetLevel } from '../types';
import { ChefHat, Leaf, Flame, Utensils } from 'lucide-react';

interface OnboardingProps {
  onComplete: (prefs: UserPreferences) => void;
}

const DIETS: DietPreference[] = ['Keto', 'Vegan', 'Vegetarian', 'High Protein', 'High Carbs'];
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Any'];
const BUDGETS: BudgetLevel[] = ['Budget', 'Moderate', 'Premium'];
const CUISINES = ['Filipino', 'Italian', 'Mexican', 'Japanese', 'Indian', 'Mediterranean', 'Thai', 'American', 'French'];

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<UserPreferences>({
    diet: 'Keto',
    allergies: [],
    budget: 'Budget',
    cuisines: [],
    mealType: 'Any'
  });

  const nextStep = () => setStep(s => s + 1);
  const prevStep = () => setStep(s => s - 1);

  const toggleCuisine = (c: string) => {
    setPrefs(p => ({
      ...p,
      cuisines: p.cuisines.includes(c) 
        ? p.cuisines.filter(x => x !== c) 
        : [...p.cuisines, c]
    }));
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-cream">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-2xl w-full card p-12"
      >
        <div className="flex justify-between items-center mb-12">
          <div className="flex items-center gap-2">
            <ChefHat className="text-brand-olive" size={32} />
            <span className="text-2xl font-serif font-semibold">Savoria</span>
          </div>
          <span className="text-sm font-medium text-brand-olive">Step {step} of 5</span>
        </div>

        {step === 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-4xl mb-4">What's your dietary style?</h2>
            <p className="text-brand-ink-muted mb-8">We'll tailor your recommendations based on how you like to eat.</p>
            <div className="grid grid-cols-2 gap-4 mb-12">
              {DIETS.map(diet => (
                <button
                  key={diet}
                  onClick={() => setPrefs({ ...prefs, diet })}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    prefs.diet === diet 
                      ? 'border-brand-olive bg-brand-olive/5 text-brand-olive' 
                      : 'border-black/5 hover:border-brand-olive/30'
                  }`}
                >
                  <div className="font-semibold">{diet}</div>
                </button>
              ))}
            </div>
            <button onClick={nextStep} className="btn-primary w-full">Continue</button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-4xl mb-4">Default meal type?</h2>
            <p className="text-brand-ink-muted mb-8">What are you usually looking for in the Lab? You can change this later.</p>
            <div className="grid grid-cols-2 gap-4 mb-12">
              {MEAL_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setPrefs({ ...prefs, mealType: type as any })}
                  className={`p-6 rounded-2xl border-2 transition-all text-left ${
                    prefs.mealType === type || (!prefs.mealType && type === 'Any')
                      ? 'border-brand-olive bg-brand-olive/5 text-brand-olive' 
                      : 'border-black/5 hover:border-brand-olive/30'
                  }`}
                >
                  <div className="font-semibold">{type}</div>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Back</button>
              <button onClick={nextStep} className="btn-primary flex-1">Next</button>
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-4xl mb-4">Set your calorie target</h2>
            <p className="text-brand-ink-muted mb-8">We'll filter recipes to help you hit your daily goals.</p>
            
            <div className="mb-12">
              <div className="flex justify-between items-center mb-6">
                <span className="text-xl font-bold font-serif text-brand-olive">{prefs.calorieGoal || 2000} kcal</span>
                <span className="text-sm font-medium text-brand-ink-subtle">Target per recipe</span>
              </div>
              <input 
                type="range" 
                min="200" 
                max="1500" 
                step="50"
                value={prefs.calorieGoal || 2000}
                onChange={(e) => setPrefs({ ...prefs, calorieGoal: parseInt(e.target.value) })}
                className="w-full accent-brand-olive cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-[10px] font-bold uppercase tracking-widest text-brand-ink-subtle">
                <span>Light (200)</span>
                <span>Medium (800)</span>
                <span>Heavy (1500)</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Back</button>
              <button onClick={nextStep} className="btn-primary flex-1">Next</button>
            </div>
          </motion.div>
        )}

        {step === 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-4xl mb-4 text-left">Set your budget & cuisines</h2>
            <p className="text-brand-ink-muted mb-8 text-left">Tell us what you're craving and how much you'd like to spend.</p>
            
            <div className="mb-8">
              <label className="block text-sm font-semibold uppercase tracking-wider mb-4 text-brand-ink-subtle">Budget Level (PHP)</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {BUDGETS.map(b => (
                  <button
                    key={b}
                    onClick={() => setPrefs({ ...prefs, budget: b })}
                    className={`p-4 rounded-xl border-2 transition-all text-center ${
                      prefs.budget === b 
                        ? 'border-brand-olive bg-brand-olive/5 text-brand-olive' 
                        : 'border-black/5 hover:border-brand-olive/30'
                    }`}
                  >
                    <div className="font-bold">{b === 'Moderate' ? 'Regular' : b}</div>
                    <div className="text-xs text-brand-ink-subtle mt-1">
                      {b === 'Budget' && '₱50 - ₱80'}
                      {b === 'Moderate' && '₱100 - ₱130'}
                      {b === 'Premium' && '₱250 - ₱350'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-12">
              <label className="block text-sm font-semibold uppercase tracking-wider mb-4 text-brand-ink-subtle">Favorite Cuisines</label>
              <div className="flex flex-wrap gap-2">
                {CUISINES.map(c => (
                  <button
                    key={c}
                    onClick={() => toggleCuisine(c)}
                    className={`px-4 py-2 rounded-full border transition-all ${
                      prefs.cuisines.includes(c)
                        ? 'bg-brand-olive text-white border-brand-olive'
                        : 'border-black/10 hover:border-brand-olive/30'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button onClick={prevStep} className="btn-secondary flex-1">Back</button>
              <button onClick={nextStep} className="btn-primary flex-1">Next</button>
            </div>
          </motion.div>
        )}

        {step === 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h2 className="text-4xl mb-4 text-left">Any allergies or restrictions?</h2>
            <p className="text-brand-ink-muted mb-8 text-left">Safety first. We'll make sure to exclude these from your recipes.</p>
            
            <textarea
              placeholder="e.g. Peanuts, Shellfish, Dairy (comma separated)"
              className="w-full p-6 rounded-2xl outline-none min-h-[150px] mb-12"
              onChange={(e) => setPrefs({ ...prefs, allergies: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
            />

            <div className="flex gap-4">
              <button onClick={prevStep} className="btn-secondary flex-1 text-base font-bold">Back</button>
              <button onClick={() => onComplete(prefs)} className="btn-primary flex-1 text-base font-bold">Find Recipes</button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
