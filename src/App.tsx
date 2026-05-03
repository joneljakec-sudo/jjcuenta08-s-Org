/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences, Recipe, Review, Notification, NewsfeedItem } from './types';
import Onboarding from './components/Onboarding';
import RecipeCard from './components/RecipeCard';
import RecipeDetail from './components/RecipeDetail';
import MyKitchen, { Tab } from './components/MyKitchen';
import CreateRecipeModal from './components/CreateRecipeModal';
import Login from './components/Login';
import UserProfile from './components/UserProfile';
import Newsfeed from './components/Newsfeed';
import PublicProfile from './components/PublicProfile';
import MealPlanner from './components/MealPlanner';
import AIRecipeLab from './components/AIRecipeLab';
import { generateRecipes } from './services/geminiService';
import { ChefHat, Search, SlidersHorizontal, LogOut, Sparkles, Loader2, Plus, Menu, X as CloseIcon, Utensils, Heart, MessageSquare, User as UserIcon, Settings, ChevronDown, Check, Moon, Sun, RefreshCw, Bell, Activity, Calendar, Microscope, Repeat, Clock } from 'lucide-react';
import { supabase } from './lib/supabase';

type View = 'dashboard' | 'my-recipes' | 'favorites' | 'feedbacks' | 'profile' | 'newsfeed' | 'meal-planner' | 'ai-lab' | 'cooked' | 'public-profile';

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string; id: string; avatarColor?: string; avatarUrl?: string } | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [viewedUser, setViewedUser] = useState<{ id: string; name: string; avatarColor: string; avatarUrl?: string } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<string>('All');
  const [view, setView] = useState<View>('dashboard');
  const [calorieFilter, setCalorieFilter] = useState<number>(2000);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [cookedIds, setCookedIds] = useState<string[]>([]);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [newsfeedItems, setNewsfeedItems] = useState<NewsfeedItem[]>([]);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [appError, setAppError] = useState<string | null>(null);

  const isConfigured = !!(
    (import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env.GEMINI_API_KEY)) && 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    // Check if critical env vars are missing
    if (!isConfigured) {
      console.warn("Critical environment variables are missing. App features will be limited.");
    }
  }, [isConfigured]);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('theme');
        if (saved) return saved === 'dark';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
    } catch (e) {
      console.warn("Theme initialization failed:", e);
    }
    return false;
  });

  useEffect(() => {
    try {
      if (isDarkMode) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      console.warn("Theme sync failed:", e);
    }
  }, [isDarkMode]);

  useEffect(() => {
    // Check active session
    if (supabase && typeof supabase.auth !== 'undefined') {
      try {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              name: session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
            });
            fetchUserData(session.user.id);
          }
        }).catch(err => {
          console.error("Supabase session check failed:", err);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setUser({
              id: session.user.id,
              name: session.user.email?.split('@')[0] || 'User',
              email: session.user.email || '',
            });
            fetchUserData(session.user.id);
          } else {
            setUser(null);
            setPreferences(null);
          }
        });

        return () => subscription.unsubscribe();
      } catch (e) {
        console.error("Auth listener setup failed:", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!user || user.id.startsWith('guest-')) return;
    if (!supabase) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      try {
        const { data } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20);
        if (data) setNotifications(data);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };

    // Fetch initial newsfeed
    const fetchNewsfeed = async () => {
      try {
        const { data } = await supabase
          .from('newsfeed')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(30);
        if (data) setNewsfeedItems(data);
      } catch (err) {
        console.error("Failed to fetch newsfeed:", err);
      }
    };

    fetchNotifications();
    fetchNewsfeed();

    // Real-time subscriptions
    const notifChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setNotifications(prev => [payload.new as Notification, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setNotifications(prev => prev.map(n => n.id === payload.new.id ? payload.new as Notification : n));
        } else if (payload.eventType === 'DELETE') {
          setNotifications(prev => prev.filter(n => n.id === payload.old.id));
        }
      })
      .subscribe();

    const newsChannel = supabase
      .channel('newsfeed-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'newsfeed' }, (payload) => {
        setNewsfeedItems(prev => [payload.new as NewsfeedItem, ...prev]);
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(notifChannel);
        supabase.removeChannel(newsChannel);
      }
    };
  }, [user]);

  const addNotification = async (title: string, message: string, type: Notification['type'], link?: string) => {
    if (!user || user.id.startsWith('guest-')) return;
    const { error } = await supabase.from('notifications').insert({
      user_id: user.id,
      title,
      message,
      type,
      link,
      read: false
    });
    if (error) console.error('Error adding notification:', error);
  };

  const addNewsfeedItem = async (type: NewsfeedItem['type'], recipe: Recipe) => {
    if (!user || user.id.startsWith('guest-')) return;
    const { error } = await supabase.from('newsfeed').insert({
      user_id: user.id,
      user_name: user.name,
      user_avatar_color: user.avatarColor,
      type,
      recipe_id: recipe.id,
      recipe_title: recipe.title,
      recipe_image: recipe.image
    });
    if (error) console.error('Error adding newsfeed item:', error);
  };

  const deleteNewsfeedItem = async (itemId: string) => {
    if (!user || user.id.startsWith('guest-')) return;
    const { error } = await supabase.from('newsfeed').delete().eq('id', itemId).eq('user_id', user.id);
    if (error) {
      console.error('Error deleting newsfeed item:', error);
    } else {
      setNewsfeedItems(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const deleteReview = async (reviewId: string) => {
    if (!user || user.id.startsWith('guest-')) return;
    const reviewToDelete = reviews.find(r => r.id === reviewId);
    if (!reviewToDelete) return;

    const { error } = await supabase.from('reviews').delete().eq('id', reviewId).eq('user_id', user.id);
    if (error) {
      console.error('Error deleting review:', error);
    } else {
      const updatedReviews = reviews.filter(review => review.id !== reviewId);
      setReviews(updatedReviews);
      
      // Update cookedIds if no reviews left for this recipe
      const remainingReviewsForRecipe = updatedReviews.filter(r => r.recipeId === reviewToDelete.recipeId);
      if (remainingReviewsForRecipe.length === 0) {
        setCookedIds(prev => prev.filter(id => id !== reviewToDelete.recipeId));
      }
    }
  };

  const clearAllHistory = async () => {
    if (!user || user.id.startsWith('guest-')) return;
    const { error } = await supabase.from('reviews').delete().eq('user_id', user.id);
    if (error) {
      console.error('Error clearing history:', error);
    } else {
      setReviews([]);
      setCookedIds([]);
      addNotification('History Cleared', 'All your cooking history and feedbacks have been removed.', 'system');
      setView('dashboard');
    }
  };

  const deleteFromHistory = async (recipeId: string) => {
    if (!user || user.id.startsWith('guest-')) return;
    const { error } = await supabase.from('reviews').delete().eq('recipe_id', recipeId).eq('user_id', user.id);
    if (error) {
      console.error('Error deleting from history:', error);
    } else {
      setReviews(prev => prev.filter(r => r.recipeId !== recipeId));
      setCookedIds(prev => prev.filter(id => id !== recipeId));
      addNotification('History Updated', 'Recipe removed from your cooked history.', 'system');
    }
  };

  const deleteUserRecipe = async (recipeId: string) => {
    if (!user || user.id.startsWith('guest-')) {
      setUserRecipes(prev => prev.filter(r => r.id !== recipeId));
      return;
    }
    const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!isSupabaseConfigured) {
      setUserRecipes(prev => prev.filter(r => r.id !== recipeId));
      return;
    }
    
    // Delete from user_recipes table
    const { error } = await supabase.from('user_recipes').delete().eq('id', recipeId).eq('user_id', user.id);
    if (error) {
      // Try deleting by filtering the recipe_data jsonb id if the direct id delete fails
      const { error: dataError } = await supabase.from('user_recipes').delete().filter('recipe_data->>id', 'eq', recipeId).eq('user_id', user.id);
      if (dataError) {
        console.error('Error deleting user recipe:', dataError);
        return;
      }
    }
    
    // Also delete any related meal swap posts (newsfeed items)
    await supabase.from('newsfeed').delete().eq('recipe_id', recipeId).eq('user_id', user.id);
    
    setUserRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
    setNewsfeedItems(prev => prev.filter(item => item.recipe_id !== recipeId));
    
    addNotification('Recipe Deleted', 'Your recipe has been removed.', 'system');
  };

  const fetchUserData = async (userId: string) => {
    if (userId.startsWith('guest-')) {
      // For guest users, we don't fetch from Supabase
      // We can set some default preferences if needed
      return;
    }
    try {
      // Fetch preferences
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      if (profile) {
        if (profile.preferences) {
          setPreferences(profile.preferences);
          if (profile.preferences.calorieGoal) {
            setCalorieFilter(profile.preferences.calorieGoal);
          }
      // If we have preferences, generate recipes if none exist
          if (recipes.length === 0) {
            setLoading(true);
            try {
              const generated = await generateRecipes(profile.preferences);
              setRecipes(generated);
            } catch (genErr: any) {
              console.error('Error generating recipes:', genErr);
              addNotification('Service Busy', genErr.message || 'The AI Chef is busy right now. Please try again later.', 'system');
            } finally {
              setLoading(false);
            }
          }
        }
        
        if (user) {
          setUser({
            ...user,
            name: profile.name || user.name,
            avatarColor: profile.avatar_color || '#5A5A40',
            avatarUrl: profile.avatar_url || ''
          });
        }
      }

      // Fetch favorites
      const { data: favData, error: favError } = await supabase
        .from('favorites')
        .select('recipe_id')
        .eq('user_id', userId);
      
      if (favError) {
        console.error('Error fetching favorites:', favError);
      } else if (favData) {
        setFavorites(favData.map(f => f.recipe_id));
      }

      // Fetch user recipes
      const { data: recipeData, error: recipeError } = await supabase
        .from('user_recipes')
        .select('recipe_data')
        .eq('user_id', userId);
      
      if (recipeError) {
        console.error('Error fetching user recipes:', recipeError);
      } else if (recipeData) {
        setUserRecipes(recipeData.map(r => r.recipe_data));
      }

      // Fetch reviews
      const { data: reviewData, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (reviewError) {
        console.error('Error fetching reviews:', reviewError);
      } else if (reviewData) {
        const fetchedReviews = reviewData.map(r => ({
          id: r.id,
          user_id: r.user_id,
          recipeId: r.recipe_id,
          userName: r.user_name,
          rating: r.rating,
          comment: r.comment,
          date: new Date(r.created_at).toLocaleDateString()
        }));
        setReviews(fetchedReviews);
        setCookedIds(Array.from(new Set(fetchedReviews.map(r => r.recipeId))));
      }

    } catch (err) {
      console.error('Unexpected error fetching user data:', err);
    }
  };

  const handleOnboardingComplete = async (prefs: UserPreferences) => {
    setPreferences(prefs);
    if (prefs.calorieGoal) {
      setCalorieFilter(prefs.calorieGoal);
    }
    setLoading(true);
    
    try {
      // Save to Supabase if user is logged in
      if (user && !user.id.startsWith('guest-')) {
        await supabase.from('profiles').upsert({
          id: user.id,
          name: user.name,
          preferences: prefs,
          updated_at: new Date().toISOString(),
        });
      }

      const generated = await generateRecipes(prefs);
      setRecipes(generated);
      
      // Trigger notification
      addNotification('Recipes Ready!', 'We have curated some fresh recipes just for you.', 'recipe_ready');
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      addNotification('Generation Failed', err.message || 'We couldn\'t generate your initial recipes. Try manually generating in the Lab.', 'system');
    } finally {
      setLoading(false);
    }
  };

  const handleUserClick = async (userId: string) => {
    if (userId === user?.id) {
      setView('profile');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (data) {
        setViewedUser({
          id: data.id,
          name: data.name || 'User',
          avatarColor: data.avatar_color || '#5A5A40',
          avatarUrl: data.avatar_url
        });
        setView('public-profile');
      }
    } catch (err) {
      console.error('Error fetching public profile:', err);
    }
  };

  const handleRecipeComplete = async (reviewData: Omit<Review, 'id' | 'date'>) => {
    if (!user) return;

    if (!user.id.startsWith('guest-')) {
      const { data, error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          recipe_id: reviewData.recipeId,
          rating: reviewData.rating,
          comment: reviewData.comment,
          user_name: user.name
        })
        .select()
        .single();

      if (!error && data) {
        const newReview: Review = {
          id: data.id,
          user_id: data.user_id,
          recipeId: data.recipe_id,
          userName: data.user_name,
          rating: data.rating,
          comment: data.comment,
          date: new Date(data.created_at).toLocaleDateString()
        };
        setReviews([newReview, ...reviews]);
        
        // Trigger notification and newsfeed
        const recipe = allAvailableRecipes.find(r => r.id === reviewData.recipeId);
        if (recipe) {
          addNotification('Recipe Cooked!', `You've successfully cooked ${recipe.title}. Great job!`, 'recipe_cooked');
          addNewsfeedItem('cooked', recipe);
        }
      } else if (error) {
        console.error('Supabase error:', error);
        // Fallback for missing config or other errors
        const newReview: Review = {
          id: Math.random().toString(),
          user_id: user.id,
          recipeId: reviewData.recipeId,
          userName: user.name,
          rating: reviewData.rating,
          comment: reviewData.comment,
          date: new Date().toLocaleDateString()
        };
        setReviews([newReview, ...reviews]);
      }
    } else {
      // Guest mode
      const newReview: Review = {
        id: Math.random().toString(),
        user_id: user.id,
        recipeId: reviewData.recipeId,
        userName: user.name,
        rating: reviewData.rating,
        comment: reviewData.comment,
        date: new Date().toLocaleDateString()
      };
      setReviews([newReview, ...reviews]);
    }

    if (!cookedIds.includes(reviewData.recipeId)) {
      setCookedIds([...cookedIds, reviewData.recipeId]);
    }
    setSelectedRecipe(null);
  };

  const toggleFavorite = async (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    if (!user) return;

    const isFav = favorites.includes(recipeId);

    if (isFav) {
      // Remove local update first for guest support
      setFavorites(prev => prev.filter(id => id !== recipeId));
      
      if (!user.id.startsWith('guest-')) {
        await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('recipe_id', recipeId);
      }
    } else {
      setFavorites(prev => [...prev, recipeId]);
      
      if (!user.id.startsWith('guest-')) {
        await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            recipe_id: recipeId
          });
      }
      
      // Trigger notification and newsfeed
      const recipe = allAvailableRecipes.find(r => r.id === recipeId);
      if (recipe) {
        addNotification('New Favorite', `You saved ${recipe.title} to your favorites.`, 'new_favorite');
        addNewsfeedItem('favorite', recipe);
      }
    }
  };

  const handleSaveUserRecipe = async (newRecipe: Recipe) => {
    if (!user) return;

    try {
      if (!user.id.startsWith('guest-')) {
        const { error: dbError } = await supabase
          .from('user_recipes')
          .insert({
            user_id: user.id,
            recipe_data: newRecipe
          });

        if (dbError) throw dbError;

        setUserRecipes([newRecipe, ...userRecipes]);
        
        // Trigger notification and newsfeed
        addNotification('Recipe Shared', `Your recipe "${newRecipe.title}" is now live!`, 'system');
        addNewsfeedItem('shared', newRecipe);
        
        // Return success for the modal
        return true;
      } else {
        setUserRecipes([newRecipe, ...userRecipes]);
        return true;
      }
    } catch (err: any) {
      console.error('Error saving user recipe:', err);
      // Detailed error for the user
      const isTableMissing = err.message?.includes('does not exist');
      const isRLSError = err.message?.includes('insufficient permissions');
      
      let msg = 'Failed to save recipe.';
      if (isTableMissing) msg = 'Database error: Tables not found. Please run the setup_supabase.sql in your Supabase SQL Editor.';
      if (isRLSError) msg = 'Database error: Insufficient permissions. Please check your Supabase RLS policies.';
      
      alert(msg + '\n\n' + err.message);
      return false;
    }
  };

  const handleUpdatePreferences = async (newPrefs: Partial<UserPreferences>) => {
    if (!preferences || !user) return;
    
    const updatedPrefs = { ...preferences, ...newPrefs };
    setPreferences(updatedPrefs);
    setLoading(true);
    
    if (!user.id.startsWith('guest-')) {
      await supabase.from('profiles').upsert({
        id: user.id,
        preferences: updatedPrefs,
        updated_at: new Date().toISOString(),
      });
    }

    try {
      const generated = await generateRecipes(updatedPrefs);
      setRecipes(generated);
      addNotification('Recipes Updated!', 'Your recommendations have been refreshed based on your new preferences.', 'recipe_ready');
      setLoading(false);
    } catch (err: any) {
      console.error('Error refreshing recipes:', err);
      addNotification('Refresh Failed', err.message || 'We couldn\'t refresh your recipes right now.', 'system');
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (updates: { name?: string; avatarColor?: string; avatarUrl?: string }) => {
    if (!user) return;
    
    if (!user.id.startsWith('guest-')) {
      await supabase.from('profiles').update({
        name: updates.name,
        avatar_color: updates.avatarColor,
        avatar_url: updates.avatarUrl,
        updated_at: new Date().toISOString(),
      }).eq('id', user.id);
    }

    setUser({
      ...user,
      name: updates.name || user.name,
      avatarColor: updates.avatarColor || user.avatarColor,
      avatarUrl: updates.avatarUrl || user.avatarUrl
    });
    setView('dashboard');
  };

  const handleUpdateRecipe = (updatedRecipe: Recipe) => {
    setRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
    setUserRecipes(prev => prev.map(r => r.id === updatedRecipe.id ? updatedRecipe : r));
  };

  if (!isConfigured && !user) {
    return (
      <div className="min-h-screen bg-[#FDFCF6] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-black/5">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="text-red-500" size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-4">Configuration Required</h1>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Savoria requires environment variables to be set up in your hosting provider (like Vercel). 
            Please check your project settings and add:
          </p>
          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left font-mono text-sm space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-800">VITE_GEMINI_API_KEY</span>
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Missing</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-800">VITE_SUPABASE_URL</span>
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Missing</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-800">VITE_SUPABASE_ANON_KEY</span>
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">Missing</span>
            </div>
          </div>
          <div className="space-y-3">
            <button 
              onClick={() => setUser({ id: 'guest-preview', name: 'Guest Chef', email: 'guest@example.com' })}
              className="w-full bg-[#4A5D23] text-white font-medium py-3 rounded-xl hover:bg-[#3A4A1C] transition-all shadow-lg shadow-[#4A5D23]/20"
            >
              Continue as Guest (Limited)
            </button>
            <p className="text-xs text-gray-400 font-sans">
              Note: Key features like AI recipe generation and cloud saving will be disabled until configured.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  if (!preferences) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const filteredRecipes = recipes.filter(r => {
    // Strictly align with user's chosen budget level and diet if filter is 'All'
    const matchesBudget = filter === 'All' ? r.budget === preferences.budget : (r.budget === filter || r.tags.includes(filter));
    const matchesDiet = filter === 'All' ? r.tags.includes(preferences.diet) : true;
    // Specific calorie target logic: Within +/- 150 calories of the slider
    const matchesCalories = r.calories >= (calorieFilter - 150) && r.calories <= (calorieFilter + 150);
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBudget && matchesDiet && matchesSearch && matchesCalories;
  });

  const allTags = Array.from(new Set(['All', ...recipes.flatMap(r => r.tags), ...recipes.map(r => r.budget)]));

  const allAvailableRecipes = Array.from(new Map([...recipes, ...userRecipes].map(r => [r.id, r])).values());
  const favoriteRecipes = allAvailableRecipes.filter(r => favorites.includes(r.id));
  const cookedRecipes = allAvailableRecipes.filter(r => cookedIds.includes(r.id));

  const navItems = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'ai-lab', label: 'AI Recipe Lab' },
    { id: 'newsfeed', label: 'Meal Swap' },
    { id: 'meal-planner', label: 'Meal Planner' },
    { id: 'my-recipes', label: 'My Recipes' },
    { id: 'favorites', label: 'Favorites' },
    { id: 'cooked', label: 'History' },
    { id: 'feedbacks', label: 'Feedbacks' },
  ];

  return (
    <div className="min-h-screen bg-brand-cream pb-20">
      {/* Header */}
      <header className="bg-white dark:bg-brand-ink/20 border-b border-black/5 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat className="text-brand-olive" size={28} />
            <span className="text-xl font-serif font-bold tracking-tight">Savoria</span>
          </div>
          
          <div className="flex items-center gap-4 md:gap-6">
            {/* Dark Mode Toggle */}
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-3 rounded-full border-2 border-black/5 hover:border-brand-olive/30 transition-all bg-white dark:bg-brand-ink/10 text-brand-olive shadow-sm"
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Logout Button (Quick Access) */}
            <button 
              onClick={async () => {
                if (confirm('Log out of Savoria?')) {
                  await supabase.auth.signOut();
                  setPreferences(null);
                  setUser(null);
                }
              }}
              className="flex p-3 rounded-full border-2 border-black/5 hover:border-red-500/30 hover:text-red-500 transition-all bg-white dark:bg-brand-ink/10 text-brand-ink-subtle shadow-sm"
              title="Logout"
            >
              <LogOut size={18} />
            </button>

            {/* User Avatar - Clickable to go to Profile */}
            <button 
              onClick={() => setView('profile')}
              className="flex items-center gap-3 group hover:opacity-80 transition-all"
              title="View Profile"
            >
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs font-bold text-brand-ink uppercase tracking-widest leading-none mb-1 group-hover:text-brand-olive transition-colors">{user.name}</span>
                <span className="text-xs text-brand-ink-subtle font-medium leading-none">View Profile</span>
              </div>
              <div 
                className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-lg border-2 border-white ring-1 ring-black/5 group-hover:scale-105 transition-transform overflow-hidden"
                style={{ backgroundColor: user.avatarColor || '#5A5A40' }}
              >
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
            </button>

              {/* Menu Button */}
              <div className="relative">
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-full border-2 border-black/5 hover:border-brand-olive/30 transition-all font-bold uppercase tracking-widest text-sm bg-white dark:bg-brand-ink/10 shadow-sm"
                >
                  {isMenuOpen ? <CloseIcon size={18} className="text-brand-olive" /> : <Menu size={18} className="text-brand-olive" />}
                  <span>Menu</span>
                </button>
              </div>
            </div>
          </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-12">
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 1, y: 0 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              {/* Hero Section */}
              <div className="mb-16">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div>
                    <div className="flex flex-wrap gap-3 mb-4">
                      <div className="flex items-center gap-2 text-brand-clay font-bold text-base">
                        <Sparkles size={18} />
                        <span>Tailored for your {preferences.diet} lifestyle</span>
                      </div>
                      <div className="flex items-center gap-2 bg-brand-olive/10 text-brand-olive px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                        <span>₱ {preferences.budget === 'Moderate' ? 'Regular' : preferences.budget}</span>
                      </div>
                    </div>
                    <h1 className="text-6xl md:text-7xl leading-[0.9] mb-6">
                      What's on the <br />
                      <span className="serif italic">menu today?</span>
                    </h1>

                    {/* Prominent Search Bar & Refresh */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-8">
                      <div className="max-w-md w-full relative group">
                        <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                          <Search size={20} className="text-brand-ink-subtle group-focus-within:text-brand-olive transition-colors" />
                        </div>
                        <input 
                          type="text" 
                          placeholder="Search for meals..."
                          className="w-full pl-14 pr-6 py-5 bg-white dark:bg-brand-ink/10 border-2 border-black/5 dark:border-white/5 rounded-[24px] outline-none focus:border-brand-olive/30 shadow-sm transition-all text-lg"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      
                      <button 
                        onClick={async () => {
                          if (!preferences) return;
                          setLoading(true);
                          try {
                            // Ensure generation respects current UI calorie filter
                            const updatedPrefs = { ...preferences, calorieGoal: calorieFilter };
                            const fresh = await generateRecipes(updatedPrefs, true);
                            setRecipes(fresh);
                            addNotification('Recipes Refreshed!', `Curated fresh recipes around ${calorieFilter} kcal.`, 'recipe_ready');
                          } catch (err: any) {
                            console.error("Refresh failed:", err);
                            addNotification('Sync Interrupted', err.message || 'The AI Chef is cooling down. Try again in a minute.', 'system');
                          } finally {
                            setLoading(false);
                          }
                        }}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-5 rounded-[24px] bg-white dark:bg-brand-ink/10 border-2 border-black/5 dark:border-white/5 hover:border-brand-olive/30 transition-all font-bold text-brand-olive shadow-sm disabled:opacity-50"
                        title="Generate Fresh AI Recipes"
                      >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        <span className="hidden sm:inline">Refresh AI</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 pb-2">
                    {allTags.slice(0, 6).map(tag => (
                      <button
                        key={tag}
                        onClick={() => setFilter(tag)}
                        className={`px-5 py-2 rounded-full text-base font-bold transition-all ${
                          filter === tag 
                            ? 'bg-brand-olive text-white shadow-lg shadow-brand-olive/20' 
                            : 'bg-white dark:bg-brand-ink/5 border border-black/5 dark:border-white/10 hover:border-brand-olive/30'
                        }`}
                      >
                        {tag === 'Moderate' ? 'Regular' : tag}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-4 bg-white dark:bg-brand-ink/10 px-6 py-2 rounded-2xl border border-black/5 dark:border-white/10 flex-1 md:flex-none">
                    <div className="text-xs font-bold uppercase tracking-widest text-brand-ink-subtle min-w-[100px]">
                      Target Calories: <span className="text-brand-olive">{calorieFilter}</span>
                    </div>
                    <input 
                      type="range" 
                      min="100" 
                      max="3000" 
                      step="50"
                      value={calorieFilter}
                      onChange={(e) => setCalorieFilter(parseInt(e.target.value))}
                      className="w-full md:w-48 accent-brand-olive cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Recipe Grid */}
              {loading ? (
                <div className="flex flex-col items-center justify-center py-32">
                  <div className="w-12 h-12 border-4 border-brand-olive border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-brand-ink-muted font-serif italic text-xl">Curating your personalized recipes...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {filteredRecipes.map((recipe, idx) => (
                    <motion.div
                      key={recipe.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.1 }}
                    >
                      <RecipeCard 
                        recipe={recipe} 
                        onClick={setSelectedRecipe} 
                        isFavorite={favorites.includes(recipe.id)}
                        onToggleFavorite={(e) => toggleFavorite(e, recipe.id)}
                        onUpdateRecipe={handleUpdateRecipe}
                      />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && filteredRecipes.length === 0 && (
                <div className="text-center py-32">
                  <p className="text-2xl text-brand-ink-muted serif italic">No recipes found matching your filters.</p>
                  <button onClick={() => setFilter('All')} className="mt-4 text-brand-olive font-medium underline underline-offset-4">
                    Clear all filters
                  </button>
                </div>
              )}
            </motion.div>
          )}

          {view === 'newsfeed' && (
            <motion.div
              key="newsfeed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Newsfeed 
                items={newsfeedItems} 
                onRecipeClick={(id) => {
                  const recipe = allAvailableRecipes.find(r => r.id === id);
                  if (recipe) setSelectedRecipe(recipe);
                }}
                onPostClick={() => setIsCreateModalOpen(true)}
                onUserClick={handleUserClick}
                currentUserId={user?.id}
                onDeletePost={deleteNewsfeedItem}
              />
            </motion.div>
          )}

          {view === 'public-profile' && viewedUser && (
            <motion.div
              key="public-profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <PublicProfile 
                user={viewedUser}
                onBack={() => setView('newsfeed')}
                onRecipeClick={(recipe) => setSelectedRecipe(recipe)}
              />
            </motion.div>
          )}

          {view === 'meal-planner' && (
            <motion.div
              key="meal-planner"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MealPlanner 
                userId={user.id}
                userRecipes={userRecipes}
                favorites={favoriteRecipes}
                onRecipeClick={setSelectedRecipe}
              />
            </motion.div>
          )}

          {view === 'ai-lab' && preferences && (
            <motion.div
              key="ai-lab"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AIRecipeLab 
                initialPreferences={preferences}
                favorites={favorites}
                onToggleFavorite={toggleFavorite}
                onRecipeClick={setSelectedRecipe}
                onNotify={(title, msg, type) => addNotification(title, msg, type)}
                onSaveRecipe={(recipe) => {
                  setRecipes(prev => [recipe, ...prev]);
                  addNotification('New Discovery!', `You've generated ${recipe.title} in the Laboratory.`, 'recipe_ready');
                }}
              />
            </motion.div>
          )}

          {view === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <UserProfile 
                profile={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  avatarColor: user.avatarColor || '#5A5A40',
                  avatarUrl: user.avatarUrl || ''
                }}
                onUpdate={handleUpdateProfile}
                onBack={() => setView('dashboard')}
                onDeleteHistory={clearAllHistory}
                onLogout={async () => {
                  await supabase.auth.signOut();
                  setPreferences(null);
                  setUser(null);
                }}
              />
            </motion.div>
          )}

          {(view === 'my-recipes' || view === 'favorites' || view === 'feedbacks' || view === 'cooked') && (
            <motion.div
              key="kitchen"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MyKitchen 
                favorites={favoriteRecipes}
                cooked={cookedRecipes}
                userRecipes={userRecipes}
                reviews={reviews}
                onRecipeClick={setSelectedRecipe}
                onPostRecipe={() => setIsCreateModalOpen(true)}
                favoriteIds={favorites}
                onToggleFavorite={toggleFavorite}
                activeTab={view === 'my-recipes' ? 'posts' : view === 'favorites' ? 'favorites' : view === 'feedbacks' ? 'feedbacks' : 'cooked'}
                onUpdateRecipe={handleUpdateRecipe}
                currentUserId={user?.id}
                onDeleteUserRecipe={deleteUserRecipe}
                onDeleteReview={deleteReview}
                onDeleteFromHistory={deleteFromHistory}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modals */}
      <AnimatePresence>
        {selectedRecipe && (
          <RecipeDetail 
            recipe={selectedRecipe} 
            onClose={() => setSelectedRecipe(null)}
            onComplete={handleRecipeComplete}
            onUpdateRecipe={handleUpdateRecipe}
            user={user}
          />
        )}
        {isCreateModalOpen && (
          <CreateRecipeModal 
            onClose={() => setIsCreateModalOpen(false)}
            onSave={handleSaveUserRecipe}
          />
        )}
      </AnimatePresence>

      {/* Global Menu Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div 
              key="menu-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-brand-ink/10 backdrop-blur-md z-50" 
              onClick={() => setIsMenuOpen(false)} 
            />
            {/* Menu Content */}
            <motion.div
              key="menu-content"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed right-6 top-24 w-80 bg-white dark:bg-brand-card rounded-[32px] shadow-2xl shadow-black/20 border border-black/5 dark:border-white/10 overflow-hidden z-[60]"
            >
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between px-4 py-2 border-b border-black/5 mb-2">
                  <span className="text-sm font-serif font-bold italic">Menu</span>
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-all">
                    <CloseIcon size={18} className="text-brand-ink-muted" />
                  </button>
                </div>

                {/* Quick Preferences Section */}
                <div className="px-4 py-4 bg-brand-cream/30 rounded-2xl mb-2">
                  <div className="flex items-center gap-2 mb-4 text-xs font-bold uppercase tracking-widest text-brand-ink-subtle">
                    <Settings size={12} />
                    Quick Preferences
                  </div>
                  
                  <div className="space-y-4">
                    {/* Theme Toggle */}
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-widest text-brand-ink-subtle">Dark Mode</label>
                      <button 
                        onClick={() => setIsDarkMode(!isDarkMode)}
                        className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${isDarkMode ? 'bg-brand-olive' : 'bg-brand-ink/10'}`}
                      >
                        <motion.div 
                          animate={{ x: isDarkMode ? 20 : 2 }}
                          className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm"
                        />
                      </button>
                    </div>

                    {/* Diet Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-2">Diet</label>
                      <div className="flex flex-wrap gap-1">
                        {['Keto', 'Vegan', 'Vegetarian', 'High Protein', 'High Carbs'].map(d => (
                          <button
                            key={d}
                            onClick={() => handleUpdatePreferences({ diet: d as any })}
                            className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                              preferences.diet === d 
                                ? 'bg-brand-olive text-white' 
                                : 'bg-white dark:bg-white/10 text-brand-ink-subtle hover:bg-brand-olive/10'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Budget Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-2">Budget</label>
                      <div className="flex gap-1">
                        {['Budget', 'Moderate', 'Premium'].map(b => (
                          <button
                            key={b}
                            onClick={() => handleUpdatePreferences({ budget: b as any })}
                            className={`flex-1 py-1 rounded-md text-xs font-bold transition-all ${
                              preferences.budget === b 
                                ? 'bg-brand-olive text-white' 
                                : 'bg-white dark:bg-white/10 text-brand-ink-subtle hover:bg-brand-olive/10'
                            }`}
                          >
                            {b === 'Moderate' ? 'Regular' : b}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notifications Section */}
                <div className="px-2 pb-2 border-b border-black/5 dark:border-white/5 mb-2">
                  <button 
                    onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                    className={`flex items-center justify-between w-full px-4 py-3 rounded-2xl text-sm font-bold uppercase tracking-widest transition-all ${
                      isNotificationOpen 
                        ? 'bg-brand-olive text-white shadow-lg shadow-brand-olive/20' 
                        : 'text-brand-ink-muted hover:bg-brand-olive/5 hover:text-brand-ink'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Bell size={18} />
                      Notifications
                    </div>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {notifications.filter(n => !n.read).length}
                      </span>
                    )}
                  </button>

                  <AnimatePresence>
                    {isNotificationOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 max-h-[300px] overflow-y-auto rounded-2xl bg-brand-cream/30 dark:bg-brand-ink/5 border border-black/5 dark:border-white/5">
                          {notifications.length === 0 ? (
                            <div className="p-8 text-center">
                              <p className="text-xs text-brand-ink-muted serif italic">No notifications yet.</p>
                            </div>
                          ) : (
                            <div className="divide-y divide-black/5 dark:divide-white/5">
                              {notifications.map(n => (
                                <div 
                                  key={n.id} 
                                  className={`p-4 hover:bg-white/50 dark:hover:bg-white/5 transition-colors cursor-pointer ${!n.read ? 'bg-brand-olive/5' : ''}`}
                                  onClick={async () => {
                                    if (!n.read) {
                                      await supabase.from('notifications').update({ read: true }).eq('id', n.id);
                                      setNotifications(prev => prev.map(notif => notif.id === n.id ? { ...notif, read: true } : notif));
                                    }
                                    setIsMenuOpen(false);
                                    setIsNotificationOpen(false);
                                  }}
                                >
                                  <h4 className={`text-xs font-bold mb-1 ${!n.read ? 'text-brand-ink' : 'text-brand-ink-muted'}`}>{n.title}</h4>
                                  <p className="text-[10px] text-brand-ink-subtle line-clamp-2">{n.message}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {navItems.map(item => (
                  <button 
                    key={item.id}
                    onClick={() => {
                      setView(item.id as View);
                      setIsMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-6 py-3 rounded-2xl text-base font-bold uppercase tracking-widest transition-all ${
                      view === item.id 
                        ? 'bg-brand-olive text-white shadow-lg shadow-brand-olive/20' 
                        : 'text-brand-ink-muted hover:bg-brand-olive/5 hover:text-brand-ink'
                    }`}
                  >
                    {item.id === 'dashboard' && <Sparkles size={18} />}
                    {item.id === 'ai-lab' && <Microscope size={18} />}
                    {item.id === 'newsfeed' && <Repeat size={18} />}
                    {item.id === 'meal-planner' && <Calendar size={18} />}
                    {item.id === 'my-recipes' && <Utensils size={18} />}
                    {item.id === 'favorites' && <Heart size={18} />}
                    {item.id === 'cooked' && <Clock size={18} />}
                    {item.id === 'feedbacks' && <MessageSquare size={18} />}
                    {item.label}
                  </button>
                ))}
                <div className="pt-2 mt-2 border-t border-black/5">
                  <button 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      setPreferences(null);
                      setUser(null);
                    }}
                    className="flex items-center gap-3 w-full px-6 py-4 rounded-2xl text-base font-bold uppercase tracking-widest text-brand-ink-muted hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 transition-all"
                  >
                    <LogOut size={18} />
                    Logout
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
