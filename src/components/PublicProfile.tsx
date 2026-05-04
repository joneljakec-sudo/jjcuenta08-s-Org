import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Recipe, NewsfeedItem } from '../types';
import { ArrowLeft, Utensils, ChefHat, Heart, Clock, UserPlus, UserCheck, MessageCircle, Star } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Skeleton, RecipeCardSkeleton, FeedItemSkeleton } from './ui/Skeleton';

interface PublicProfileProps {
  user: {
    id: string;
    name: string;
    avatarColor: string;
    avatarUrl?: string;
  };
  onBack: () => void;
  onRecipeClick: (recipe: Recipe) => void;
  currentUser?: { id: string };
  onFriendRequest?: (userId: string) => void;
  onMessageClick?: (user: any) => void;
}

export default function PublicProfile({ user, onBack, onRecipeClick, currentUser, onFriendRequest, onMessageClick }: PublicProfileProps) {
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [userPosts, setUserPosts] = useState<NewsfeedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [friendStatus, setFriendStatus] = useState<'none' | 'pending' | 'accepted'>('none');

  useEffect(() => {
    fetchUserData();
    if (currentUser) {
      checkFriendship();
    }
  }, [user.id]);

  const checkFriendship = async () => {
    if (!currentUser) return;
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select('status')
        .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${user.id}),and(sender_id.eq.${user.id},receiver_id.eq.${currentUser.id})`)
        .single();
      
      if (data) {
        setFriendStatus(data.status);
      }
    } catch (err) {
      // Not a big deal if it fails
    }
  };

  const fetchUserData = async () => {
    setLoading(true);
    try {
      // Fetch user recipes
      const { data: recipeData } = await supabase
        .from('user_recipes')
        .select('recipe_data')
        .eq('user_id', user.id);
      
      if (recipeData) {
        setUserRecipes(recipeData.map(r => r.recipe_data));
      }

      // Fetch user newsfeed posts
      const { data: postData } = await supabase
        .from('newsfeed')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (postData) {
        setUserPosts(postData);
      }
    } catch (err) {
      console.error('Error fetching public user data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-brand-ink-muted hover:text-brand-ink transition-colors mb-12 font-bold uppercase tracking-widest text-xs"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      <div className="flex flex-col md:flex-row items-center gap-8 mb-16 px-8">
        {loading ? (
          <Skeleton variant="circular" className="w-32 h-32" />
        ) : (
          <div 
            className="w-32 h-32 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-2xl border-4 border-white ring-1 ring-black/5 overflow-hidden"
            style={{ backgroundColor: user.avatarColor }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
        )}
        <div className="text-center md:text-left flex-1">
          {loading ? (
            <div className="space-y-4">
              <Skeleton variant="text" className="w-48 h-10" />
              <div className="flex gap-4">
                <Skeleton variant="rectangular" className="w-24 h-10 rounded-2xl" />
                <Skeleton variant="rectangular" className="w-24 h-10 rounded-2xl" />
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-4xl font-serif font-bold text-brand-ink mb-2">{user.name}</h1>
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-black/5 shadow-sm">
                  <Utensils size={16} className="text-brand-olive" />
                  <span className="text-sm font-bold">{userRecipes.length} Recipes</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl border border-black/5 shadow-sm">
                  <ChefHat size={16} className="text-brand-olive" />
                  <span className="text-sm font-bold">{userPosts.filter(p => p.type === 'cooked').length} Cooked</span>
                </div>
              </div>

              {currentUser && currentUser.id !== user.id && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2">
                  {friendStatus === 'none' ? (
                    <button 
                      onClick={() => {
                        onFriendRequest?.(user.id);
                        setFriendStatus('pending');
                      }}
                      className="flex items-center gap-2 px-6 py-2 bg-[#1877F2] text-white font-bold rounded-lg shadow-md hover:bg-[#166fe5] transition-colors"
                    >
                      <UserPlus size={18} />
                      Add Friend
                    </button>
                  ) : friendStatus === 'pending' ? (
                    <button className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg cursor-default">
                      <Clock size={18} />
                      Request Pending
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 px-6 py-2 bg-green-500 text-white font-bold rounded-lg">
                      <UserCheck size={18} />
                      Friends
                    </div>
                  )}
                  <button 
                    onClick={() => onMessageClick?.(user)}
                    className="flex items-center gap-2 px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <MessageCircle size={18} />
                    Message
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="space-y-16">
        {/* Shared Recipes */}
        <div>
          <h2 className="text-2xl font-serif font-bold mb-8 flex items-center gap-3">
            <SparkleIcon /> Shared <span className="text-brand-olive italic">Recipes</span>
          </h2>
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {[...Array(2)].map((_, i) => <RecipeCardSkeleton key={i} />)}
            </div>
          ) : userRecipes.length === 0 ? (
            <p className="text-brand-ink-muted italic text-center py-12 bg-white/50 rounded-3xl border border-dashed border-black/10">No recipes shared yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {userRecipes.map(recipe => (
                <div 
                  key={recipe.id}
                  onClick={() => onRecipeClick(recipe)}
                  className="card p-4 flex gap-4 cursor-pointer hover:border-brand-olive/30 transition-all group"
                >
                  <div className="w-24 h-24 rounded-2xl overflow-hidden flex-shrink-0">
                    <img src={recipe.image} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                  </div>
                  <div>
                    <h3 className="font-bold text-brand-ink mb-1 group-hover:text-brand-olive transition-colors">{recipe.title}</h3>
                    
                    <div className="flex items-center gap-0.5 mb-2">
                       {[1, 2, 3, 4, 5].map((star) => (
                         <Star
                           key={star}
                           size={10}
                           fill={star <= (recipe.rating || 0) ? '#EAB308' : 'none'}
                           className={star <= (recipe.rating || 0) ? 'text-yellow-500' : 'text-gray-300'}
                         />
                       ))}
                       <span className="text-[8px] text-gray-500 ml-1 font-bold">({recipe.ratingCount || 0})</span>
                    </div>

                    <p className="text-xs text-brand-ink-muted line-clamp-2 mb-2">{recipe.description}</p>
                    <div className="flex gap-2">
                       {recipe.tags.slice(0, 2).map(tag => (
                         <span key={tag} className="px-2 py-0.5 bg-brand-olive/10 text-brand-olive text-[8px] font-bold uppercase tracking-widest rounded-full">{tag}</span>
                       ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div>
          <h2 className="text-2xl font-serif font-bold mb-8">Recent <span className="text-brand-olive italic">Activity</span></h2>
          {loading ? (
            <div className="space-y-4">
               {[...Array(3)].map((_, i) => (
                 <div key={i} className="flex gap-4 items-center bg-white/50 dark:bg-brand-ink/5 p-4 rounded-3xl border border-black/5">
                   <Skeleton variant="circular" className="w-10 h-10" />
                   <Skeleton variant="text" className="flex-1" />
                 </div>
               ))}
            </div>
          ) : userPosts.length === 0 ? (
            <p className="text-brand-ink-muted italic text-center py-12">No recent activity.</p>
          ) : (
            <div className="space-y-4">
              {userPosts.map(post => (
                <div key={post.id} className="flex gap-4 items-center bg-white/50 dark:bg-brand-ink/5 p-4 rounded-3xl border border-black/5">
                  <div className="p-2 bg-brand-cream rounded-xl">
                    {post.type === 'cooked' && <ChefHat size={20} className="text-brand-olive" />}
                    {post.type === 'favorite' && <Heart size={20} className="text-brand-clay" fill="currentColor" />}
                    {post.type === 'shared' && <Utensils size={20} className="text-brand-olive" />}
                  </div>
                  <div className="flex-grow">
                    <p className="text-sm">
                      <span className="font-bold">{user.name}</span>
                      <span className="text-brand-ink-subtle ml-1">
                        {post.type === 'cooked' && 'cooked'}
                        {post.type === 'shared' && 'shared'}
                        {post.type === 'favorite' && 'favorited'}
                      </span>
                      <span className="font-bold ml-1">{post.recipe_title}</span>
                    </p>
                    <p className="text-[10px] text-brand-ink-subtle uppercase tracking-widest font-bold mt-1">
                      {new Date(post.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SparkleIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-brand-olive">
      <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5L12 3Z" fill="currentColor" />
    </svg>
  );
}

function LoaderIcon() {
  return (
    <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-olive border-t-transparent" />
  );
}
