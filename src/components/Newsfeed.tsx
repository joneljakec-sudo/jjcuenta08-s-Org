import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NewsfeedItem, UserProfileData, PostComment } from '../types';
import { Utensils, Heart, ChefHat, Clock, Trash2, MessageSquare, Share2, Send, Image as ImageIcon, Smile, MapPin, MoreHorizontal, Loader2, ThumbsUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FeedItemSkeleton } from './ui/Skeleton';
import Swipeable from './ui/Swipeable';

interface NewsfeedProps {
  items: NewsfeedItem[];
  currentUser: UserProfileData | null;
  onRecipeClick: (recipeId: string | undefined) => void;
  onPostClick: (content: string, image?: string) => void;
  onUserClick?: (userId: string) => void;
  onDeletePost?: (id: string) => void;
  onLikePost?: (id: string) => void;
  onCommentPost?: (id: string, content: string) => void;
  loading?: boolean;
}

export default function Newsfeed({ 
  items, 
  currentUser,
  onRecipeClick, 
  onPostClick, 
  onUserClick, 
  onDeletePost, 
  onLikePost,
  onCommentPost,
  loading 
}: NewsfeedProps) {
  const [newPostContent, setNewPostContent] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentsData, setCommentsData] = useState<Record<string, PostComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [loadingComments, setLoadingComments] = useState<Record<string, boolean>>({});

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const past = new Date(dateString);
    const diffInMs = now.getTime() - past.getTime();
    const diffInMins = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMins / 60);
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInMins < 1) return 'Just now';
    if (diffInMins < 60) return `${diffInMins}m`;
    if (diffInHours < 24) return `${diffInHours}h`;
    return `${diffInDays}d`;
  };

  const fetchComments = async (postId: string) => {
    if (commentsData[postId]) return; // Already fetched

    setLoadingComments(prev => ({ ...prev, [postId]: true }));
    try {
      const { data, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setCommentsData(prev => ({ ...prev, [postId]: data || [] }));
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId: string) => {
    const isExpanded = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: isExpanded }));
    if (isExpanded) {
      fetchComments(postId);
    }
  };

  const handlePostComment = async (postId: string) => {
    const content = commentInputs[postId];
    if (!content?.trim() || !onCommentPost) return;

    // Optimistic update
    const newComment: PostComment = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      user_id: currentUser?.id || 'guest',
      user_name: currentUser?.name || 'Guest',
      user_avatar_color: currentUser?.avatarColor,
      content: content.trim(),
      created_at: new Date().toISOString()
    };

    setCommentsData(prev => ({
      ...prev,
      [postId]: [...(prev[postId] || []), newComment]
    }));
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));

    onCommentPost(postId, content.trim());
  };

  const handleSubmitPost = () => {
    if (!newPostContent.trim()) return;
    setIsPosting(true);
    onPostClick(newPostContent);
    setNewPostContent('');
    setIsExpanded(false);
    setTimeout(() => setIsPosting(false), 500);
  };

  return (
    <div className="max-w-xl mx-auto space-y-3 pb-20">
      {/* Facebook Lite Style Creator */}
      <div className="bg-white dark:bg-brand-card shadow-sm border-b border-black/5 dark:border-white/5 p-3">
        <div className="flex gap-3">
          <div 
            className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: currentUser?.avatarColor || '#1877F2' }}
          >
            {currentUser?.avatarUrl ? (
              <img src={currentUser.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
            ) : currentUser?.name.charAt(0).toUpperCase()}
          </div>
          
          <div className="flex-grow">
            {!isExpanded ? (
              <div className="space-y-3">
                <button 
                  onClick={() => setIsExpanded(true)}
                  className="w-full text-left px-4 py-2 bg-gray-100 dark:bg-brand-ink/10 rounded-full text-gray-500 hover:bg-gray-200 transition-colors text-[15px]"
                >
                  What's on your mind?
                </button>
                <div className="flex border-t border-black/5 dark:border-white/5 pt-2">
                  <button className="flex-1 flex items-center justify-center gap-2 py-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded text-xs font-bold transition-colors">
                    <ImageIcon size={16} className="text-green-500" />
                    <span>Photo</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded text-xs font-bold transition-colors">
                    <Smile size={16} className="text-yellow-500" />
                    <span>Feeling</span>
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 py-1 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 rounded text-xs font-bold transition-colors">
                    <MapPin size={16} className="text-red-500" />
                    <span>Check In</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <textarea 
                  autoFocus
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  className="w-full bg-transparent border-none focus:ring-0 text-brand-ink min-h-[80px] text-base resize-none p-0"
                />
                <div className="flex justify-end gap-2 pt-2 border-t border-black/5">
                  <button 
                    onClick={() => setIsExpanded(false)}
                    className="px-4 py-1.5 text-gray-500 font-bold text-sm hover:bg-gray-100 dark:hover:bg-brand-ink/10 rounded"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmitPost}
                    disabled={!newPostContent.trim() || isPosting}
                    className="bg-[#1877F2] text-white px-6 py-1.5 rounded font-bold text-sm disabled:opacity-50"
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <FeedItemSkeleton key={i} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-brand-card p-10 text-center text-gray-500 italic">
          <p>The community is quiet. Be the first to post!</p>
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence initial={false}>
            {items.map((item, idx) => {
              const isOwner = currentUser?.id === item.user_id;
              
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-white dark:bg-brand-card shadow-sm border-y md:border md:rounded-lg border-black/5 dark:border-white/5"
                >
                  {/* Header */}
                  <div className="p-3 flex justify-between items-center">
                    <div className="flex gap-2">
                      <div 
                        onClick={() => onUserClick?.(item.user_id)}
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold cursor-pointer"
                        style={{ backgroundColor: item.user_avatar_color || '#1877F2' }}
                      >
                        {item.user_avatar_url ? (
                          <img src={item.user_avatar_url} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : item.user_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="leading-tight">
                        <h4 
                          onClick={() => onUserClick?.(item.user_id)}
                          className="font-bold text-brand-ink hover:underline cursor-pointer"
                        >
                          {item.user_name}
                        </h4>
                        <div className="flex items-center gap-1 text-[11px] text-gray-500 font-medium">
                          <span>{getTimeAgo(item.created_at)}</span>
                          <span>•</span>
                          <span className="capitalize">{item.type === 'post' ? 'Community' : item.type}</span>
                        </div>
                      </div>
                    </div>
                    {isOwner && (
                      <button 
                        onClick={() => onDeletePost?.(item.id)}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  {/* Body */}
                  <div className="px-3 pb-3">
                    {item.content && (
                      <p className="text-[15px] text-brand-ink mb-3 whitespace-pre-wrap">{item.content}</p>
                    )}
                    
                    {item.recipe_id && (
                      <div 
                        onClick={() => onRecipeClick(item.recipe_id)}
                        className="border border-black/5 dark:border-white/5 rounded overflow-hidden bg-gray-50 dark:bg-brand-ink/5 cursor-pointer hover:bg-gray-100 transition-colors"
                      >
                        <div className="aspect-video relative group">
                          <img 
                            src={item.recipe_image} 
                            alt={item.recipe_title} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="p-3">
                          <h4 className="font-bold text-sm text-brand-ink line-clamp-1">{item.recipe_title}</h4>
                          <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mt-1">
                            Chef's Recommendation
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mx-3 py-2 border-t border-black/5 flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      {(item.likes_count || 0) > 0 && (
                        <div className="flex items-center gap-1">
                          <div className="bg-[#1877F2] p-0.5 rounded-full">
                            <Heart size={10} className="text-white" fill="white" />
                          </div>
                          <span>{item.likes_count}</span>
                        </div>
                      )}
                    </div>
                    {(item.comments_count || 0) > 0 && (
                      <span>{item.comments_count} Comments</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="mx-3 border-t border-black/5 py-1 flex items-center">
                    <button 
                      onClick={() => onLikePost?.(item.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-brand-ink/5 rounded text-sm font-bold transition-colors ${item.has_liked ? 'text-[#1877F2]' : 'text-gray-600'}`}
                    >
                      <ThumbsUp size={18} fill={item.has_liked ? 'currentColor' : 'none'} />
                      <span>Like</span>
                    </button>
                    <button 
                      onClick={() => toggleComments(item.id)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-brand-ink/5 rounded text-sm font-bold transition-colors ${expandedComments[item.id] ? 'text-[#1877F2]' : 'text-gray-600'}`}
                    >
                      <MessageSquare size={18} fill={expandedComments[item.id] ? 'currentColor' : 'none'} />
                      <span>Comment</span>
                    </button>
                    <button 
                      className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-gray-100 dark:hover:bg-brand-ink/5 rounded text-gray-600 text-sm font-bold"
                    >
                      <Share2 size={18} />
                      <span>Share</span>
                    </button>
                  </div>

                  {/* Comment Section */}
                  <AnimatePresence>
                    {expandedComments[item.id] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t border-black/5 dark:border-white/5 overflow-hidden"
                      >
                        <div className="p-3 space-y-4">
                          {/* Comments List */}
                          <div className="space-y-3">
                            {loadingComments[item.id] ? (
                              <div className="flex justify-center py-4">
                                <Loader2 size={24} className="animate-spin text-brand-olive" />
                              </div>
                            ) : (commentsData[item.id] || []).length === 0 ? (
                              <p className="text-center text-xs text-gray-500 italic py-2">No comments yet. Be the first to join the conversation!</p>
                            ) : (
                              commentsData[item.id].map(comment => (
                                <div key={comment.id} className="flex gap-2">
                                  <div 
                                    onClick={() => onUserClick?.(comment.user_id)}
                                    className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                                    style={{ backgroundColor: comment.user_avatar_color || '#1877F2' }}
                                  >
                                    {comment.user_name.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-grow">
                                    <div className="bg-gray-100 dark:bg-brand-ink/10 rounded-2xl px-3 py-2 border border-black/5 dark:border-white/5">
                                      <h5 
                                        onClick={() => onUserClick?.(comment.user_id)}
                                        className="font-bold text-xs text-brand-ink hover:underline cursor-pointer"
                                      >
                                        {comment.user_name}
                                      </h5>
                                      <p className="text-sm text-brand-ink">{comment.content}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-500 ml-2">{getTimeAgo(comment.created_at)}</span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>

                          {/* New Comment Input */}
                          <div className="flex gap-2 pt-2">
                            <div 
                              className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-[10px] font-bold"
                              style={{ backgroundColor: currentUser?.avatarColor || '#1877F2' }}
                            >
                              {currentUser?.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-grow relative">
                              <input 
                                type="text"
                                placeholder="Write a comment..."
                                value={commentInputs[item.id] || ''}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [item.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePostComment(item.id);
                                }}
                                className="w-full bg-gray-100 dark:bg-brand-ink/10 border-none rounded-full px-4 py-2 text-sm focus:ring-1 focus:ring-[#1877F2] pr-10"
                              />
                              <button 
                                onClick={() => handlePostComment(item.id)}
                                disabled={!(commentInputs[item.id] || '').trim()}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#1877F2] disabled:opacity-30 p-1"
                              >
                                <Send size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

