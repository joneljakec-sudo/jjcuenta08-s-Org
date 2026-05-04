/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserPreferences, Recipe, Review, Notification, NewsfeedItem, AppError } from './types';

declare global {
  interface Window {
    refreshNewsfeed: () => Promise<void>;
  }
}
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
import Messenger from './components/Messenger';
import Friends from './components/Friends';
import { generateRecipes } from './services/geminiService';
import { RecipeCardSkeleton } from './components/ui/Skeleton';
import { ChefHat, Search, SlidersHorizontal, LogOut, Sparkles, Loader2, Plus, Menu, X as CloseIcon, Utensils, Heart, MessageSquare, User as UserIcon, Settings, ChevronDown, Check, Moon, Sun, RefreshCw, Bell, Activity, Calendar, Microscope, Repeat, Clock, UserPlus } from 'lucide-react';
import { supabase } from './lib/supabase';

type View = 'dashboard' | 'my-recipes' | 'favorites' | 'feedbacks' | 'profile' | 'newsfeed' | 'meal-planner' | 'ai-lab' | 'cooked' | 'public-profile' | 'notifications' | 'friends' | 'messenger';

export default function App() {
  const [user, setUser] = useState<{ name: string; email: string; id: string; avatarColor?: string; avatarUrl?: string } | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [userDataLoading, setUserDataLoading] = useState(false);
  const [newsfeedLoading, setNewsfeedLoading] = useState(false);
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
  const [appError, setAppError] = useState<AppError | null>(null);
  const [isOnline, setIsOnline] = useState(true); // Default to true to be optimistic
  const [supabaseStatus, setSupabaseStatus] = useState<'connecting' | 'connected' | 'error'>('connecting');

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    }
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check for Supabase
    const checkSupabase = async () => {
      try {
        if (!supabase) {
          setSupabaseStatus('error');
          return;
        }
        const { error } = await supabase.from('newsfeed').select('id').limit(1);
        if (error) {
          console.warn('Supabase initial check returned error:', error);
          if (error.code === '42501') { // Permission denied - still connected, just RLS
            setSupabaseStatus('connected');
          } else {
            setSupabaseStatus('error');
          }
        } else {
          setSupabaseStatus('connected');
        }
      } catch (err) {
        setSupabaseStatus('error');
      }
    };
    
    checkSupabase();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const ServerStatusIndicator = () => (
    <div className="fixed bottom-24 left-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {!isOnline && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex items-center gap-2 bg-red-500 text-white px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg"
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            NO INTERNET CONNECTION
          </motion.div>
        )}
        {isOnline && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold shadow-lg ${
              supabaseStatus === 'connected' ? 'bg-green-500 text-white' : 
              supabaseStatus === 'connecting' ? 'bg-amber-500 text-white' : 'bg-red-500 text-white'
            }`}
          >
            <div className={`w-2 h-2 rounded-full bg-white ${supabaseStatus === 'connecting' ? 'animate-pulse' : ''}`} />
            {supabaseStatus === 'connected' ? 'SERVER ONLINE' : 
             supabaseStatus === 'connecting' ? 'CONNECTING TO SERVER...' : 'SERVER CONNECTION ERROR'}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );

  useEffect(() => {
    if (!isOnline) {
      setAppError({
        message: 'You are currently offline. Some features like recipe generation and meal swap may not work.',
        severity: 'warning',
        code: 'OFFLINE'
      });
    } else if (appError?.code === 'OFFLINE') {
      setAppError(null);
    }
  }, [isOnline]);

  const isConfigured = !!(
    (import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY.startsWith('AIza')) && 
    (import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL.startsWith('https://')) && 
    import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  const [showConfigForce, setShowConfigForce] = useState(false);

  useEffect(() => {
    if (!isConfigured) {
      console.warn("Critical environment variables are missing or incorrectly formatted.");
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
    if (!user) return;
    if (!supabase) return;

    // Fetch initial notifications
    const fetchNotifications = async () => {
      if (user.id.startsWith('guest-')) return;
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
      setNewsfeedLoading(true);
      try {
        const { data, error } = await supabase
          .from('newsfeed')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        
        if (data && user && !user.id.startsWith('guest-')) {
          // Also fetch current user's likes
          const { data: userLikes } = await supabase
            .from('post_likes')
            .select('post_id')
            .eq('user_id', user.id);
            
          const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
          
          const itemsWithLikes = data.map(item => ({
            ...item,
            has_liked: likedPostIds.has(item.id)
          }));
          
          setNewsfeedItems(itemsWithLikes);
        } else if (data) {
          setNewsfeedItems(data);
        }
      } catch (err) {
        console.error("Failed to fetch newsfeed:", err);
      } finally {
        setNewsfeedLoading(false);
      }
    };

    window.refreshNewsfeed = fetchNewsfeed;

    fetchNotifications();
    fetchNewsfeed();

    // Real-time subscriptions
    const notifChannel = supabase
      .channel('notifications-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, (payload: any) => {
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'newsfeed' }, (payload: any) => {
        if (payload.eventType === 'INSERT') {
          // Check if it's already in the list (optimistic UI)
          setNewsfeedItems(prev => {
            const exists = prev.some(item => item.id === payload.new.id || (item.id.startsWith('temp-') && item.content === payload.new.content));
            if (exists && payload.new.id.startsWith('temp-')) return prev;
            
            // If we have a temp post with same content, replace it
            const filtered = prev.filter(item => !(item.id.startsWith('temp-') && item.content === payload.new.content));
            return [payload.new as NewsfeedItem, ...filtered];
          });
        } else if (payload.eventType === 'UPDATE') {
          setNewsfeedItems(prev => prev.map(p => p.id === payload.new.id ? { ...p, ...payload.new, has_liked: p.has_liked } : p));
        } else if (payload.eventType === 'DELETE') {
          setNewsfeedItems(prev => prev.filter(p => p.id === payload.old.id));
        }
      })
      .subscribe();

    const msgChannel = supabase
      .channel('global-messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages'
      }, async (payload: any) => {
        // Find if this message belongs to the user and they aren't the sender
        if (payload.new.sender_id === user.id) return;
        
        const { data: conv } = await supabase.from('conversations').select('participant_ids').eq('id', payload.new.conversation_id).single();
        if (conv?.participant_ids?.includes(user.id)) {
          addNotification('New Message', payload.new.content || 'Sent a media file', 'system');
        }
      })
      .subscribe();

    const friendChannel = supabase
      .channel('global-friends')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'friendships'
      }, (payload: any) => {
        if (payload.eventType === 'INSERT' && payload.new.receiver_id === user.id) {
          addNotification('Friend Request', 'Someone sent you a friend request!', 'system');
        } else if (payload.eventType === 'UPDATE' && payload.new.status === 'accepted' && (payload.new.sender_id === user.id || payload.new.receiver_id === user.id)) {
          addNotification('New Friend', 'Your friend request was accepted!', 'system');
        }
      })
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(notifChannel);
        supabase.removeChannel(newsChannel);
        supabase.removeChannel(msgChannel);
        supabase.removeChannel(friendChannel);
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

  const addNewsfeedPost = async (content: string, image?: string) => {
    if (!user) return;
    
    const newPost = {
      id: `temp-${Date.now()}`,
      user_id: user.id,
      user_name: user.name,
      user_avatar_color: user.avatarColor,
      user_avatar_url: user.avatarUrl,
      type: 'post' as const,
      content,
      recipe_image: image,
      likes_count: 0,
      comments_count: 0,
      created_at: new Date().toISOString()
    };

    // Optimistic update
    setNewsfeedItems(prev => [newPost, ...prev]);

    if (user.id.startsWith('guest-')) {
      addNotification('Guest Mode', 'Your post was added locally but will not be saved permanently. Sign in to share with everyone!', 'system');
      return;
    }

    try {
      const { data, error } = await supabase.from('newsfeed').insert({
        user_id: user.id,
        user_name: user.name,
        user_avatar_color: user.avatarColor,
        user_avatar_url: user.avatarUrl,
        type: 'post',
        content,
        recipe_image: image,
        likes_count: 0,
        comments_count: 0
      }).select().single();

      if (error) {
        throw error;
      }
      
      // Update the temp post with the real ID from DB
      if (data) {
        setNewsfeedItems(prev => prev.map(p => p.id === newPost.id ? data : p));
      }
    } catch (error: any) {
      console.error('Error adding newsfeed post:', error);
      // Rollback on error
      setNewsfeedItems(prev => prev.filter(p => p.id !== newPost.id));
      
      let errorMsg = 'Could not share your post.';
      if (error.message?.includes('insufficient permissions') || error.code === '42501') {
        errorMsg = 'Permission denied. Please check if your account is fully verified or if Supabase RLS is configured.';
      } else if (error.message?.includes('relation') && error.message?.includes('does not exist')) {
        errorMsg = 'Newsfeed database table is missing. Please run the setup SQL in your Supabase dashboard.';
      } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
        errorMsg = 'Connection error. Please check your internet and try again.';
      }
      
      addNotification('Post Failed', errorMsg, 'system');
    }
  };

  const togglePostLike = async (postId: string) => {
    if (!user || user.id.startsWith('guest-')) return;
    const post = newsfeedItems.find(p => p.id === postId);
    if (!post) return;
  
    const hasLiked = post.has_liked;
    const currentLikes = post.likes_count || 0;
    const newLikes = hasLiked ? Math.max(0, currentLikes - 1) : currentLikes + 1;
    
    // Optimistic UI update
    setNewsfeedItems(prev => prev.map(p => p.id === postId ? { ...p, has_liked: !hasLiked, likes_count: newLikes } : p));
  
    try {
      if (hasLiked) {
        // Remove like
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        // Add like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id
          });
      }
    } catch (err) {
      console.error('Error toggling like:', err);
      // Rollback on hard error if needed, but triggers handle counts
    }
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

  const addPostComment = async (postId: string, content: string) => {
    if (!user) return;

    // Increment comment count locally for immediate feedback
    setNewsfeedItems(prev => prev.map(p => 
      p.id === postId ? { ...p, comments_count: (p.comments_count || 0) + 1 } : p
    ));

    if (user.id.startsWith('guest-')) {
      addNotification('Guest Mode', 'Your comment was added locally but will not be saved permanently.', 'system');
      return;
    }

    try {
      const { error } = await supabase.from('post_comments').insert({
        post_id: postId,
        user_id: user.id,
        user_name: user.name,
        user_avatar_color: user.avatarColor,
        user_avatar_url: user.avatarUrl,
        content: content
      });

      if (error) throw error;
      
      // Note: Trigger in Supabase handles newsfeed.comments_count increment

    } catch (err: any) {
      console.error('Error posting comment:', err);
      // Rollback optimistic update on error
      setNewsfeedItems(prev => prev.map(p => 
        p.id === postId ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) } : p
      ));
      addNotification('Comment Failed', err.message || 'Could not post comment.', 'system');
    }
  };

  const handleRate = async (recipeId: string, starRating: number) => {
    // Optimistically update local state
    const updateInList = (list: Recipe[]) => 
      list.map(r => {
        if (r.id === recipeId) {
          const currentCount = r.ratingCount || 0;
          const currentRating = r.rating || 0;
          const newCount = currentCount + 1;
          const newRating = ((currentRating * currentCount) + starRating) / newCount;
          return { ...r, rating: newRating, ratingCount: newCount };
        }
        return r;
      });

    setRecipes(prev => updateInList(prev));
    setUserRecipes(prev => updateInList(prev));
    
    addNotification('Rating Added!', `You gave this recipe ${starRating} stars.`, 'system');

    // In a real app, you would persist this to the database
    if (user && !user.id.startsWith('guest-')) {
      try {
        const targetRecipe = allAvailableRecipes.find(r => r.id === recipeId);
        if (targetRecipe) {
           await supabase.from('global_recipes').update({
             recipe_data: {
               ...targetRecipe,
               rating: ((targetRecipe.rating || 0) * (targetRecipe.ratingCount || 0) + starRating) / ((targetRecipe.ratingCount || 0) + 1),
               ratingCount: (targetRecipe.ratingCount || 0) + 1
             }
           }).eq('id', recipeId);
        }
      } catch (err) {
        console.error("Error persisting rating:", err);
      }
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
    
    try {
      // Delete reviews (feedbacks and cooking history)
      const { error: reviewsError } = await supabase.from('reviews').delete().eq('user_id', user.id);
      if (reviewsError) throw reviewsError;

      // Delete newsfeed items (posts and activity)
      const { error: newsfeedError } = await supabase.from('newsfeed').delete().eq('user_id', user.id);
      if (newsfeedError) throw newsfeedError;

      // Delete post comments
      const { error: commentsError } = await supabase.from('post_comments').delete().eq('user_id', user.id);
      if (commentsError) throw commentsError;

      // Delete notifications
      const { error: notifError } = await supabase.from('notifications').delete().eq('user_id', user.id);
      if (notifError) throw notifError;

      setReviews([]);
      setCookedIds([]);
      setNewsfeedItems(prev => prev.filter(item => item.user_id !== user.id));
      setNotifications([]);
      
      addNotification('Data Cleared', 'All your history, feedbacks, and activities have been removed.', 'system');
      setView('dashboard');
    } catch (err) {
      console.error('Error clearing history:', err);
      setAppError({
        message: 'Failed to clear some data. Please try again.',
        severity: 'error'
      });
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
    setUserDataLoading(true);
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
              setAppError({
                message: genErr.message || 'AI Chef is busy. Using fallbacks.',
                severity: 'warning',
                code: genErr.code
              });
              setRecipes([]);
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
    } finally {
      setUserDataLoading(false);
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
      setAppError({
        message: err.message || 'Failed to generate recipes. Please try again from the AI Lab.',
        severity: 'error',
        code: err.code,
        retryable: true,
        actionLabel: 'Try Lab',
        onAction: () => {
          setView('ai-lab');
          setAppError(null);
        }
      });
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
      setAppError({
        message: err.message || 'Could not update recipes. Check your connection.',
        severity: 'error',
        code: err.code
      });
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

  if (!isConfigured && !user && !showConfigForce) {
    const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    
    return (
      <div className="min-h-screen bg-[#FDFCF6] flex items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 border border-black/5">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings className="text-amber-600" size={32} />
          </div>
          <h1 className="text-2xl font-serif font-bold text-gray-900 mb-4">Final Configuration Needed</h1>
          <p className="text-gray-600 mb-6 text-sm leading-relaxed">
            Savoria needs these variables in your <strong>Vercel Project Settings</strong> (Settings &gt; Environment Variables). 
          </p>
          
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 text-sm text-amber-800 text-left">
            <strong>Critical:</strong> After adding variables starting with <code>VITE_</code>, you <strong>MUST trigger a new Deployment</strong> for them to take effect.
          </div>

          <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left font-mono text-xs space-y-3">
            <div className="flex justify-between items-center pb-1 border-b border-gray-200">
              <span className="text-gray-400">VARIABLE</span>
              <span className="text-gray-400">STATUS</span>
            </div>
            
            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-800">VITE_GEMINI_API_KEY</span>
                {geminiKey.startsWith('AIza') ? (
                  <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">READY</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">MISSING</span>
                )}
              </div>
              {!geminiKey.startsWith('AIza') && geminiKey.length > 0 && (
                <p className="text-[9px] text-amber-600 mt-0.5">Value doesn't look like a Gemini Key (should start with AIza...)</p>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <div className="flex justify-between items-center">
                <span className="text-gray-800">VITE_SUPABASE_URL</span>
                {supabaseUrl.startsWith('https://') ? (
                  <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">READY</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">MISSING</span>
                )}
              </div>
              {!supabaseUrl.startsWith('https://') && supabaseUrl.length > 0 && (
                <p className="text-[9px] text-amber-600 mt-0.5">Should start with https://</p>
              )}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-800">VITE_SUPABASE_ANON_KEY</span>
              {import.meta.env.VITE_SUPABASE_ANON_KEY ? (
                <span className="text-[10px] px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-bold">READY</span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-bold">MISSING</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <button 
              onClick={() => setShowConfigForce(true)}
              className="w-full bg-[#4A5D23] text-white font-medium py-3 rounded-xl hover:bg-[#3A4A1C] transition-all"
            >
              I've added them, take me to Login
            </button>
            <button 
              onClick={() => setUser({ id: 'guest-preview', name: 'Guest Chef', email: 'guest@example.com' })}
              className="w-full bg-white border-2 border-gray-100 text-gray-600 font-medium py-3 rounded-xl hover:bg-gray-50 transition-all"
            >
              Continue as Guest (Read Only)
            </button>
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-100">
             <p className="text-[10px] text-gray-400 font-sans leading-relaxed">
              <strong>Need help?</strong> Get your Gemini Key at <a href="https://aistudio.google.com/app/apikey" target="_blank" className="underline text-blue-400">Google AI Studio</a>. 
              Find your Supabase credentials in Project Settings &gt; API.
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
    // New: Match user's preferred cuisines if filter is 'All' and cuisines are selected
    const matchesCuisine = (filter === 'All' && preferences.cuisines.length > 0)
      ? r.tags.some(tag => preferences.cuisines.includes(tag))
      : true;
    // Specific calorie target logic: Within +/- 150 calories of the slider
    const matchesCalories = r.calories >= (calorieFilter - 150) && r.calories <= (calorieFilter + 150);
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         r.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesBudget && matchesDiet && matchesCuisine && matchesSearch && matchesCalories;
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
      <ServerStatusIndicator />
      {/* FB Lite style layout but with Savoria branding */}
      <header className="bg-white dark:bg-brand-card border-b border-black/5 sticky top-0 z-40 transition-colors">
        <div className="max-w-xl mx-auto flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <ChefHat className="text-brand-olive" size={24} />
            <span className="text-2xl font-serif font-black tracking-tight text-brand-ink">savoria</span>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => {}}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-brand-ink"
            >
              <Search size={22} />
            </button>
            <button 
              onClick={async () => {
                if (confirm('Log out of Savoria?')) {
                  await supabase.auth.signOut();
                  setPreferences(null);
                  setUser(null);
                }
              }}
              className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-brand-ink"
              title="Logout"
            >
              <LogOut size={22} />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        <AnimatePresence>
          {appError && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={`border-t border-black/5 px-4 py-2 flex items-center justify-between text-xs font-bold ${
                appError.severity === 'error' ? 'bg-red-500 text-white' : 
                appError.severity === 'warning' ? 'bg-amber-400 text-brand-ink' : 
                'bg-brand-olive text-white'
              }`}
            >
              <div className="flex items-center gap-2">
                {appError.severity === 'error' ? <CloseIcon size={14} /> : <Bell size={14} />}
                <p>{appError.message}</p>
              </div>
              <div className="flex items-center gap-2">
                {appError.actionLabel && (
                  <button 
                    onClick={appError.onAction}
                    className="underline decoration-2"
                  >
                    {appError.actionLabel}
                  </button>
                )}
                <button onClick={() => setAppError(null)} className="p-1 hover:bg-black/10 rounded">
                  <CloseIcon size={14} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Navigation Tabs */}
        <div className="max-w-xl mx-auto flex h-12">
          {[
            { id: 'newsfeed', icon: <Activity size={22} /> },
            { id: 'friends', icon: <UserPlus size={22} /> },
            { id: 'messenger', icon: <MessageSquare size={22} /> },
            { id: 'ai-lab', icon: <Sparkles size={22} /> },
            { id: 'notifications', icon: (
              <div className="relative">
                <Bell size={22} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                    {notifications.filter(n => !n.read).length}
                  </span>
                )}
              </div>
            ) },
            { id: 'profile', icon: <UserIcon size={22} /> },
            { id: 'dashboard', icon: <Utensils size={22} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id as View)}
              className={`flex-1 flex items-center justify-center border-b-2 transition-all ${
                view === tab.id 
                  ? 'border-brand-olive text-brand-olive' 
                  : 'border-transparent text-brand-ink-subtle opacity-50 hover:opacity-100'
              }`}
            >
              {tab.icon}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 pt-4 min-h-screen">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, i) => (
                    <RecipeCardSkeleton key={i} />
                  ))}
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
                        onRate={handleRate}
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

          {view === 'notifications' && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto space-y-4"
            >
              <div className="flex items-center justify-between px-1">
                <h2 className="text-2xl font-black text-brand-ink">Notifications</h2>
                <button 
                  onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                  className="text-[#1877F2] font-bold text-sm hover:underline"
                >
                  Mark all as read
                </button>
              </div>
              <div className="bg-white dark:bg-brand-card rounded-lg shadow-sm border border-black/5 overflow-hidden">
                {notifications.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 italic">
                    <p>No new notifications.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-black/5">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id} 
                        className={`p-4 flex gap-4 hover:bg-gray-50 transition-colors cursor-pointer ${notif.read ? 'opacity-60' : 'bg-[#E7F3FF]/30'}`}
                        onClick={() => {
                          setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                          if (notif.link) {
                            // Handle internal links
                            if (notif.link === 'newsfeed') setView('newsfeed');
                          }
                        }}
                      >
                        <div className={`w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white ${
                          notif.type === 'system' ? 'bg-blue-500' : 
                          notif.type === 'recipe_ready' ? 'bg-green-500' : 
                          'bg-brand-olive'
                        }`}>
                          {notif.type === 'system' ? <Bell size={24} /> : <ChefHat size={24} />}
                        </div>
                        <div className="flex-grow">
                          <p className="text-brand-ink font-bold leading-tight">{notif.title}</p>
                          <p className="text-sm text-brand-ink-subtle mt-1">{notif.message}</p>
                          <p className="text-[11px] text-[#1877F2] font-bold mt-2 uppercase">
                            {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!notif.read && (
                          <div className="w-3 h-3 rounded-full bg-[#1877F2] self-center" />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
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
                currentUser={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  avatarColor: user.avatarColor || '#5A5A40',
                  avatarUrl: user.avatarUrl
                }}
                loading={newsfeedLoading}
                onRecipeClick={(id) => {
                  if (!id) return;
                  const recipe = allAvailableRecipes.find(r => r.id === id);
                  if (recipe) setSelectedRecipe(recipe);
                }}
                onPostClick={addNewsfeedPost}
                onUserClick={handleUserClick}
                onDeletePost={deleteNewsfeedItem}
                onLikePost={togglePostLike}
                onCommentPost={addPostComment}
                onRefresh={async () => {
                  setNewsfeedLoading(true);
                  try {
                    const { data } = await supabase
                      .from('newsfeed')
                      .select('*')
                      .order('created_at', { ascending: false })
                      .limit(50);
                    if (data) setNewsfeedItems(data);
                  } catch (err) {
                    console.error("Manual refresh failed:", err);
                  } finally {
                    setNewsfeedLoading(false);
                  }
                }}
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
                currentUser={user}
                onFriendRequest={async (targetId) => {
                  if (user.id.startsWith('guest-')) {
                    addNotification('Guest Mode', 'Please sign in to add friends!', 'system');
                    return;
                  }
                  await supabase.from('friendships').insert({
                    sender_id: user.id,
                    receiver_id: targetId,
                    status: 'pending'
                  });
                  addNotification('Friend Request Sent', 'Waiting for confirmation.', 'system');
                }}
                onMessageClick={() => setView('messenger')}
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
                onRate={handleRate}
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

          {view === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Friends 
                currentUser={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  avatarColor: user.avatarColor || '#1877F2',
                  avatarUrl: user.avatarUrl
                }}
                onUserClick={handleUserClick}
                onMessageClick={() => setView('messenger')}
              />
            </motion.div>
          )}

          {view === 'messenger' && (
            <motion.div
              key="messenger"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Messenger 
                currentUser={{
                  id: user.id,
                  name: user.name,
                  email: user.email,
                  avatarColor: user.avatarColor || '#1877F2',
                  avatarUrl: user.avatarUrl
                }}
                onUserClick={handleUserClick}
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
                loading={userDataLoading}
                onRecipeClick={setSelectedRecipe}
                onPostRecipe={() => setIsCreateModalOpen(true)}
                favoriteIds={favorites}
                onToggleFavorite={toggleFavorite}
                activeTab={view === 'my-recipes' ? 'posts' : view === 'favorites' ? 'favorites' : view === 'feedbacks' ? 'feedbacks' : 'cooked'}
                onUpdateRecipe={handleUpdateRecipe}
                onRate={handleRate}
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
