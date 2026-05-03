import React from 'react';
import { motion } from 'motion/react';
import { NewsfeedItem } from '../types';
import { Utensils, Heart, ChefHat, Clock, Trash2 } from 'lucide-react';

interface NewsfeedProps {
  items: NewsfeedItem[];
  onRecipeClick: (recipeId: string) => void;
  onPostClick: () => void;
  onUserClick?: (userId: string) => void;
  currentUserId?: string;
  onDeletePost?: (id: string) => void;
}

import Swipeable from './ui/Swipeable';

export default function Newsfeed({ items, onRecipeClick, onPostClick, onUserClick, currentUserId, onDeletePost }: NewsfeedProps) {
  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    return `${diffInDays}d ago`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-5xl mb-2">Meal Swap</h2>
          <p className="text-brand-ink-muted serif italic text-lg">See what others are cooking and sharing.</p>
        </div>
        <button 
          onClick={onPostClick}
          className="btn-primary py-4 px-8 flex items-center gap-2 self-start md:self-center"
        >
          <Utensils size={18} />
          <span>Post to Swap</span>
        </button>
      </div>

      {items.length === 0 ? (
        <div className="card p-20 text-center border border-dashed border-black/10 dark:border-white/10">
          <Utensils className="mx-auto mb-4 text-brand-ink-subtle opacity-20" size={48} />
          <p className="text-brand-ink-muted serif italic text-xl">The feed is quiet today.</p>
          <p className="text-sm text-brand-ink-subtle mt-2">Start cooking or sharing recipes to see them here!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {items.map((item, idx) => {
            const isOwner = currentUserId === item.user_id;
            
            const cardContent = (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="card p-6 flex gap-6 items-start hover:border-brand-olive/30 transition-all cursor-pointer"
                onClick={() => onRecipeClick(item.recipe_id)}
              >
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    onUserClick?.(item.user_id);
                  }}
                  className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold shadow-md cursor-pointer hover:scale-110 transition-transform"
                  style={{ backgroundColor: item.user_avatar_color || '#5A5A40' }}
                >
                  {item.user_name.charAt(0).toUpperCase()}
                </div>
                
                <div className="flex-grow">
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm">
                      <span 
                        onClick={(e) => {
                          e.stopPropagation();
                          onUserClick?.(item.user_id);
                        }}
                        className="font-bold text-brand-ink hover:text-brand-olive cursor-pointer"
                      >
                        {item.user_name}
                      </span>
                      <span className="text-brand-ink-muted ml-1">
                        {item.type === 'cooked' && 'just cooked'}
                        {item.type === 'shared' && 'shared a new recipe'}
                        {item.type === 'favorite' && 'saved to favorites'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-brand-ink-subtle font-medium">
                      <Clock size={12} />
                      {getTimeAgo(item.created_at)}
                      {isOwner && onDeletePost && (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Delete this post?')) {
                              onDeletePost(item.id);
                            }
                          }}
                          className="ml-2 text-brand-ink-subtle hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-4 items-center bg-brand-cream/50 dark:bg-brand-ink/5 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                    <img 
                      src={item.recipe_image} 
                      alt={item.recipe_title} 
                      className="w-16 h-16 rounded-xl object-cover shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="font-bold text-brand-ink leading-tight">{item.recipe_title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        {item.type === 'cooked' && <ChefHat size={14} className="text-brand-olive" />}
                        {item.type === 'favorite' && <Heart size={14} className="text-brand-clay" fill="currentColor" />}
                        {item.type === 'shared' && <Utensils size={14} className="text-brand-olive" />}
                        <span className="text-xs font-bold uppercase tracking-widest text-brand-olive">
                          {item.type === 'cooked' ? 'Masterpiece' : item.type === 'favorite' ? 'Loved' : 'New Recipe'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );

            return isOwner && onDeletePost ? (
              <Swipeable key={item.id} onDelete={() => onDeletePost(item.id)} confirmMessage="Delete this post?">
                {cardContent}
              </Swipeable>
            ) : (
              <div key={item.id}>
                {cardContent}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
