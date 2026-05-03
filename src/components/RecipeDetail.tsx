import React, { useState } from 'react';
import { Recipe, Review } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Flame, Utensils, CheckCircle2, Star, ChevronRight, ChevronLeft, Play, RefreshCw, Video } from 'lucide-react';
import { generateRecipeImage, generateRecipeVideo } from '../services/geminiService';
import { supabase } from '../lib/supabase';

interface RecipeDetailProps {
  recipe: Recipe;
  onClose: () => void;
  onComplete: (review: Omit<Review, 'id' | 'date'>) => void;
  onUpdateRecipe?: (updatedRecipe: Recipe) => void;
  user?: { id: string; name: string } | null;
}

type DetailView = 'overview' | 'cooking' | 'feedback';

export default function RecipeDetail({ recipe, onClose, onComplete, onUpdateRecipe, user }: RecipeDetailProps) {
  const [view, setView] = useState<DetailView>('overview');
  const [currentStep, setCurrentStep] = useState(0);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

  const isFallback = recipe.image?.includes('loremflickr.com');
  const hasAIVideo = recipe.videoUrl?.startsWith('data:video');
  const isYouTube = recipe.videoUrl?.includes('youtube.com');

  const handleRegenerateImage = async () => {
    if (isRegenerating) return;

    setIsRegenerating(true);
    try {
      const newImageUrl = await generateRecipeImage(recipe.title);
      const updatedRecipe = { ...recipe, image: newImageUrl };
      
      // Update in Supabase
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

  const handleGenerateVideo = async () => {
    if (isGeneratingVideo) return;

    // Check for API key selection if using Veo
    if (typeof window !== 'undefined' && (window as any).aistudio) {
      const hasKey = await (window as any).aistudio.hasSelectedApiKey();
      if (!hasKey) {
        await (window as any).aistudio.openSelectKey();
        return; // Selection opened, user needs to click again
      }
    }

    setIsGeneratingVideo(true);
    try {
      const newVideoUrl = await generateRecipeVideo(recipe.title);
      if (newVideoUrl) {
        const updatedRecipe = { ...recipe, videoUrl: newVideoUrl };
        
        // Update in Supabase
        const { error } = await supabase
          .from('global_recipes')
          .update({ recipe_data: updatedRecipe })
          .eq('title', recipe.title);

        if (error) console.error("Error updating recipe video in Supabase:", error);
        
        if (onUpdateRecipe) {
          onUpdateRecipe(updatedRecipe);
        }
      }
    } catch (error) {
      console.error("Failed to generate video:", error);
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const handleFinish = () => {
    onComplete({
      user_id: user?.id || '',
      recipeId: recipe.id,
      userName: user?.name || 'You',
      rating,
      comment
    });
  };

  const nextStep = () => {
    if (currentStep < recipe.instructions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      setView('feedback');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    } else {
      setView('overview');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-brand-ink/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-brand-cream dark:bg-brand-card w-full max-w-5xl max-h-[90vh] rounded-[40px] overflow-hidden flex flex-col md:flex-row shadow-2xl"
      >
        <div className="md:w-1/2 relative h-64 md:h-auto overflow-hidden">
          <motion.img 
            key={view === 'cooking' ? `step-${currentStep}` : 'main'}
            initial={{ scale: 1.1, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            src={recipe.image} 
            alt={recipe.title} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-brand-ink/40 to-transparent" />
          
          {isRegenerating && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center">
              <RefreshCw size={48} className="animate-spin mb-4" />
              <p className="text-xl font-bold">Generating AI Image...</p>
              <p className="opacity-80">Using Imagen 4.0</p>
            </div>
          )}

          {isGeneratingVideo && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4 text-center">
              <Video size={48} className="animate-bounce mb-4" />
              <p className="text-xl font-bold">Generating AI Video...</p>
              <p className="opacity-80 font-medium">Using Veo 3.1 Lite</p>
              <div className="mt-4 flex gap-1">
                {[1, 2, 3].map(i => (
                  <motion.div 
                    key={i}
                    animate={{ scale: [1, 1.5, 1] }} 
                    transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                    className="w-2 h-2 bg-brand-olive rounded-full" 
                  />
                ))}
              </div>
              <p className="mt-6 text-xs italic opacity-60">This may take a minute or two...</p>
            </div>
          )}

          <button 
            onClick={onClose}
            className="absolute top-6 left-6 bg-white/90 dark:bg-brand-card/90 backdrop-blur p-3 rounded-full hover:bg-white dark:hover:bg-brand-card transition-colors shadow-lg"
          >
            <X size={20} />
          </button>

          {isFallback && !isRegenerating && (
            <button 
              onClick={handleRegenerateImage}
              className="absolute top-6 right-6 bg-brand-olive text-white p-3 rounded-full hover:bg-brand-olive/90 transition-colors shadow-lg flex items-center gap-2 px-4"
            >
              <RefreshCw size={18} />
              <span className="text-sm font-bold uppercase tracking-widest">Generate AI Image</span>
            </button>
          )}
          
          {view === 'cooking' && recipe.instructions.length > 0 && (
            <div className="absolute bottom-10 left-10 right-10">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-white"
                    initial={{ width: 0 }}
                    animate={{ width: `${((currentStep + 1) / Math.max(1, recipe.instructions.length)) * 100}%` }}
                  />
                </div>
                <span className="text-white font-bold text-sm">
                  {currentStep + 1} / {recipe.instructions.length}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="md:w-1/2 p-12 overflow-y-auto bg-white/50 dark:bg-brand-card/50">
          <AnimatePresence mode="wait">
            {view === 'overview' && (
              <motion.div 
                key="overview"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex gap-2 mb-6">
                  {recipe.tags.map(tag => (
                    <span key={tag} className="px-3 py-1 bg-brand-olive/10 text-brand-olive text-xs uppercase tracking-widest font-bold rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
                <h2 className="text-5xl mb-6 font-serif leading-tight">{recipe.title}</h2>
                <p className="text-brand-ink-muted text-lg mb-8 leading-relaxed">{recipe.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
                  <div className="bg-white dark:bg-white/10 p-4 rounded-2xl text-center shadow-sm border border-black/5 dark:border-white/10">
                    <Clock className="mx-auto mb-2 text-brand-olive" size={20} />
                    <div className="text-xs font-bold uppercase text-brand-ink-subtle tracking-wider">Time</div>
                    <div className="font-bold">{recipe.prepTime}</div>
                  </div>
                  <div className="bg-white dark:bg-white/10 p-4 rounded-2xl text-center shadow-sm border border-black/5 dark:border-white/10">
                    <Flame className="mx-auto mb-2 text-brand-olive" size={20} />
                    <div className="text-xs font-bold uppercase text-brand-ink-subtle tracking-wider">Calories</div>
                    <div className="font-bold">{recipe.calories}</div>
                  </div>
                  <div className="bg-white dark:bg-white/10 p-4 rounded-2xl text-center shadow-sm border border-black/5 dark:border-white/10">
                    <Utensils className="mx-auto mb-2 text-brand-olive" size={20} />
                    <div className="text-xs font-bold uppercase text-brand-ink-subtle tracking-wider">Difficulty</div>
                    <div className="font-bold">{recipe.difficulty}</div>
                  </div>
                  <div className="bg-white dark:bg-white/10 p-4 rounded-2xl text-center shadow-sm border border-black/5 dark:border-white/10">
                    <div className="text-brand-olive font-bold text-xl mb-1">₱</div>
                    <div className="text-xs font-bold uppercase text-brand-ink-subtle tracking-wider">Est. Cost</div>
                    <div className="font-bold">{recipe.estimatedCost}</div>
                  </div>
                </div>

                {recipe.videoUrl && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-6">
                      <h4 className="text-2xl serif italic">Cooking Guide</h4>
                      {!hasAIVideo && (
                        <button 
                          onClick={handleGenerateVideo}
                          disabled={isGeneratingVideo}
                          className="flex items-center gap-2 px-4 py-2 bg-brand-olive/10 text-brand-olive rounded-full text-xs font-bold uppercase tracking-widest hover:bg-brand-olive hover:text-white transition-all disabled:opacity-50"
                        >
                          <Video size={14} />
                          Generate AI Video
                        </button>
                      )}
                    </div>
                    
                    <div className="bg-brand-ink rounded-[32px] overflow-hidden aspect-video relative group border-4 border-black/5 dark:border-white/10 shadow-2xl">
                      {hasAIVideo ? (
                        <video 
                          key={recipe.videoUrl}
                          src={recipe.videoUrl} 
                          controls 
                          className="w-full h-full object-cover" 
                          poster={recipe.image}
                        />
                      ) : (
                        <>
                          <div className="absolute inset-0 flex items-center justify-center bg-brand-ink/40 group-hover:bg-brand-ink/20 transition-all cursor-pointer" onClick={() => window.open(recipe.videoUrl, '_blank')}>
                            <div className="w-20 h-20 bg-brand-olive rounded-full flex items-center justify-center text-white shadow-xl shadow-brand-olive/20 group-hover:scale-110 transition-transform">
                              <Play size={32} fill="currentColor" />
                            </div>
                          </div>
                          <img src={recipe.image} alt="Video Preview" className="w-full h-full object-cover opacity-60" />
                          <div className="absolute bottom-6 left-6 right-6">
                            <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20">
                              <p className="text-white font-bold text-sm">How to cook {recipe.title}</p>
                              <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-1">Video Tutorial on YouTube</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="mb-12">
                  <h4 className="text-2xl mb-6 serif italic">Nutritional Facts</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-brand-olive/5 p-4 rounded-2xl border border-brand-olive/10">
                      <div className="text-xs font-bold uppercase tracking-widest text-brand-olive mb-1">Protein</div>
                      <div className="text-2xl font-bold text-brand-olive">{recipe.nutrients.protein}</div>
                      <div className="h-1 w-full bg-brand-olive/10 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '70%' }}
                          className="h-full bg-brand-olive"
                        />
                      </div>
                    </div>
                    <div className="bg-brand-clay/5 p-4 rounded-2xl border border-brand-clay/10">
                      <div className="text-xs font-bold uppercase tracking-widest text-brand-clay mb-1">Carbs</div>
                      <div className="text-2xl font-bold text-brand-clay">{recipe.nutrients.carbs}</div>
                      <div className="h-1 w-full bg-brand-clay/10 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '45%' }}
                          className="h-full bg-brand-clay"
                        />
                      </div>
                    </div>
                    <div className="bg-brand-ink/5 p-4 rounded-2xl border border-brand-ink/10">
                      <div className="text-xs font-bold uppercase tracking-widest text-brand-ink-muted mb-1">Fat</div>
                      <div className="text-2xl font-bold text-brand-ink">{recipe.nutrients.fat}</div>
                      <div className="h-1 w-full bg-brand-ink/10 rounded-full mt-2 overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: '30%' }}
                          className="h-full bg-brand-ink"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mb-12">
                  <h4 className="text-2xl mb-6 serif italic">Ingredients</h4>
                  <ul className="grid grid-cols-1 gap-3">
                    {recipe.ingredients.map((ing, i) => (
                      <li key={i} className="flex items-center gap-3 text-brand-ink bg-white/60 dark:bg-white/10 p-3 rounded-xl border border-black/5 dark:border-white/10">
                        <div className="w-2 h-2 rounded-full bg-brand-olive" />
                        <span className="font-medium">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  onClick={() => setView('cooking')}
                  className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3"
                >
                  <Play size={20} fill="currentColor" />
                  Start Cooking
                </button>
              </motion.div>
            )}

            {view === 'cooking' && (
              <motion.div 
                key="cooking"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="h-full flex flex-col"
              >
                <div className="flex justify-between items-center mb-12">
                  <h2 className="text-4xl font-serif">Step {currentStep + 1}</h2>
                  <div className="px-4 py-2 bg-brand-olive/10 text-brand-olive rounded-full text-sm font-bold">
                    {recipe.instructions.length > 0 ? Math.round(((currentStep + 1) / recipe.instructions.length) * 100) : 0}% Complete
                  </div>
                </div>

                <div className="flex-grow flex items-center justify-center mb-12">
                  <motion.div 
                    key={currentStep}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center"
                  >
                    <p className="text-3xl leading-snug text-brand-ink font-medium">
                      {recipe.instructions[currentStep]}
                    </p>
                  </motion.div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-auto">
                  <button 
                    onClick={prevStep}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl border-2 border-black/5 hover:bg-black/5 transition-all font-bold"
                  >
                    <ChevronLeft size={20} />
                    {currentStep === 0 ? 'Overview' : 'Previous'}
                  </button>
                  <button 
                    onClick={nextStep}
                    className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-brand-olive text-white font-bold shadow-lg shadow-brand-olive/20 hover:bg-brand-olive/90 transition-all"
                  >
                    {currentStep === recipe.instructions.length - 1 ? 'Finish Cooking' : 'Next Step'}
                    <ChevronRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}

            {view === 'feedback' && (
              <motion.div 
                key="feedback"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="text-center mb-12">
                  <div className="w-20 h-20 bg-brand-olive/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle2 className="text-brand-olive" size={40} />
                  </div>
                  <h2 className="text-4xl font-serif mb-4">Delicious!</h2>
                  <p className="text-brand-ink-muted">How did your {recipe.title} turn out?</p>
                </div>

                <div className="space-y-8">
                  <div className="text-center">
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Rate your experience</label>
                    <div className="flex justify-center gap-3">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button 
                          key={s} 
                          onClick={() => setRating(s)}
                          className={`p-2 transition-all transform hover:scale-110 ${rating >= s ? 'text-brand-clay' : 'text-black/10'}`}
                        >
                          <Star fill={rating >= s ? 'currentColor' : 'none'} size={48} />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Share your thoughts</label>
                    <textarea 
                      placeholder="Was it easy? Any tips for others?"
                      className="w-full p-6 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-[24px] outline-none min-h-[150px] transition-all"
                      value={comment}
                      onKeyDown={(e) => e.stopPropagation()}
                      onChange={(e) => setComment(e.target.value)}
                    />
                  </div>

                  <button 
                    onClick={handleFinish}
                    className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3"
                  >
                    Save Review & Return
                  </button>
                  
                  <button 
                    onClick={() => setView('cooking')}
                    className="w-full text-center text-sm font-bold text-brand-ink-subtle hover:text-brand-ink transition-colors"
                  >
                    Back to Instructions
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}
