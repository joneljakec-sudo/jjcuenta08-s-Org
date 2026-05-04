import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfileData, Friendship } from '../types';
import { UserPlus, UserCheck, UserX, Search, MessageCircle, MoreHorizontal, Users, ChefHat } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FriendsProps {
  currentUser: UserProfileData;
  onUserClick?: (id: string) => void;
  onMessageClick?: (user: UserProfileData) => void;
}

export default function Friends({ currentUser, onUserClick, onMessageClick }: FriendsProps) {
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [requests, setRequests] = useState<Friendship[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfileData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'discover'>('friends');

  useEffect(() => {
    if (!currentUser.id.startsWith('guest-')) {
      fetchFriendships();
    } else {
        // Mock data for guests
        setFriends([
            { id: 'm-1', sender_id: 'guest', receiver_id: 'chef-1', status: 'accepted', created_at: new Date().toISOString(), friend: { id: 'chef-1', name: 'Master Chef G', email: 'g@chef.com', avatarColor: '#1877F2' } }
        ]);
        setRequests([
            { id: 'm-2', sender_id: 'chef-2', receiver_id: 'guest', status: 'pending', created_at: new Date().toISOString(), friend: { id: 'chef-2', name: 'Sous Chef Sam', email: 'sam@chef.com', avatarColor: '#5A5A40' } }
        ]);
    }
  }, [currentUser.id]);

  const fetchFriendships = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('friendships')
        .select(`
          *,
          sender:sender_id(*),
          receiver:receiver_id(*)
        `)
        .or(`sender_id.eq.${currentUser.id},receiver_id.eq.${currentUser.id}`);

      if (fetchErr) {
          if (fetchErr.message?.includes('relation') || fetchErr.message?.includes('does not exist')) {
              setError('Friends feature database is not ready.');
          } else {
              setError('Failed to load friends. Check your connection.');
          }
          return;
      }

      const formatted = (data || []).map(f => {
        const isSender = f.sender_id === currentUser.id;
        return {
          ...f,
          friend: isSender ? f.receiver : f.sender
        };
      });

      setFriends(formatted.filter(f => f.status === 'accepted'));
      setRequests(formatted.filter(f => f.status === 'pending' && f.receiver_id === currentUser.id));
    } catch (err) {
      console.error('Error fetching friendships:', err);
      setError('An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setError(null);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const { data, error: searchErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('name', `%${query}%`)
        .neq('id', currentUser.id)
        .limit(10);

      if (searchErr) {
          setError('Search failed. Please try again.');
          return;
      }
      setSearchResults(data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Search is currently unavailable.');
    }
  };

  const handleFriendRequest = async (targetId: string, action: 'send' | 'accept' | 'reject') => {
    if (currentUser.id.startsWith('guest-')) {
        alert("Please sign in to manage friends.");
        return;
    }

    try {
      if (action === 'send') {
        const { error } = await supabase.from('friendships').insert({
          sender_id: currentUser.id,
          receiver_id: targetId,
          status: 'pending'
        });
        if (error) throw error;
      } else if (action === 'accept') {
        const friendship = requests.find(r => r.friend?.id === targetId);
        if (friendship) {
          const { error } = await supabase.from('friendships').update({
            status: 'accepted'
          }).eq('id', friendship.id);
          if (error) throw error;
        }
      } else if (action === 'reject') {
        const friendship = requests.find(r => r.friend?.id === targetId);
        if (friendship) {
          const { error } = await supabase.from('friendships').delete().eq('id', friendship.id);
          if (error) throw error;
        }
      }
      fetchFriendships();
    } catch (err) {
      console.error('Error handling friend request:', err);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="bg-white dark:bg-brand-card rounded-lg shadow-sm border border-black/5 overflow-hidden">
        <div className="flex border-b border-black/5">
          <button 
            onClick={() => setActiveTab('friends')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'friends' ? 'text-[#1877F2] border-b-2 border-[#1877F2]' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Friends ({friends.length})
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-3 text-sm font-bold transition-colors relative ${activeTab === 'requests' ? 'text-[#1877F2] border-b-2 border-[#1877F2]' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Requests
            {requests.length > 0 && (
              <span className="absolute top-2 right-4 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">
                {requests.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('discover')}
            className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'discover' ? 'text-[#1877F2] border-b-2 border-[#1877F2]' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Discover
          </button>
        </div>

        <div className="p-4">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 flex items-center gap-2">
               <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <UserX size={12} />
              </div>
              {error}
            </div>
          )}
          {activeTab === 'discover' && (
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search for chefs or foodies..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-100 dark:bg-brand-ink/20 border-none rounded-lg text-sm focus:ring-2 focus:ring-[#1877F2]/20"
              />
            </div>
          )}

          <div className="space-y-4">
            {activeTab === 'friends' && (
              friends.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 px-4"
                >
                  <Users className="mx-auto mb-6 text-brand-ink-subtle opacity-20" size={64} strokeWidth={1.5} />
                  <h3 className="text-2xl font-serif mb-3">Your network is empty</h3>
                  <p className="text-sm text-brand-ink-muted italic mb-8 max-w-xs mx-auto">
                    Every great meal is better shared. Connect with other food lovers to see their latest creations and swap tips.
                  </p>
                  <button 
                    onClick={() => setActiveTab('discover')}
                    className="inline-flex items-center gap-2 px-8 py-3 bg-[#1877F2] text-white rounded-2xl font-bold text-sm shadow-lg shadow-[#1877F2]/20 hover:scale-105 transition-all"
                  >
                    <Search size={18} />
                    Find Friends to Follow
                  </button>
                </motion.div>
              ) : (
                friends.map((f) => (
                  <div key={f.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div 
                        onClick={() => f.friend && onUserClick?.(f.friend.id)}
                        className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold cursor-pointer"
                        style={{ backgroundColor: f.friend?.avatarColor || '#1877F2' }}
                      >
                        {f.friend?.avatarUrl ? (
                          <img src={f.friend.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : f.friend?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 
                          onClick={() => f.friend && onUserClick?.(f.friend.id)}
                          className="font-bold text-brand-ink hover:underline cursor-pointer"
                        >
                          {f.friend?.name}
                        </h4>
                        <p className="text-xs text-gray-500">Mutual friends coming soon</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => f.friend && onMessageClick?.(f.friend)}
                        className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-brand-ink/10 dark:hover:bg-brand-ink/20 rounded-full text-brand-ink"
                        title="Send Message"
                      >
                        <MessageCircle size={20} />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                        <MoreHorizontal size={20} />
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === 'requests' && (
              requests.length === 0 ? (
                <div className="text-center py-12 text-gray-500 italic">
                  <p>No pending friend requests.</p>
                </div>
              ) : (
                requests.map((r) => (
                  <div key={r.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-gray-50 dark:bg-brand-ink/5 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-16 h-16 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xl font-bold"
                        style={{ backgroundColor: r.friend?.avatarColor || '#1877F2' }}
                      >
                        {r.friend?.avatarUrl ? (
                          <img src={r.friend.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                        ) : r.friend?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-brand-ink">{r.friend?.name}</h4>
                        <p className="text-sm text-gray-500">Sent you a friend request</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => r.friend && handleFriendRequest(r.friend.id, 'accept')}
                        className="flex-1 sm:flex-none px-6 py-2 bg-[#1877F2] text-white font-bold rounded-lg text-sm"
                      >
                        Confirm
                      </button>
                      <button 
                        onClick={() => r.friend && handleFriendRequest(r.friend.id, 'reject')}
                        className="flex-1 sm:flex-none px-6 py-2 bg-gray-200 text-gray-700 font-bold rounded-lg text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )
            )}

            {activeTab === 'discover' && (
              searchQuery ? (
                searchResults.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No results for "{searchQuery}"</p>
                  </div>
                ) : (
                  searchResults.map((user) => {
                    const isFriend = friends.some(f => f.friend?.id === user.id);
                    const isPending = requests.some(r => r.friend?.id === user.id);
                    
                    return (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div 
                            onClick={() => onUserClick?.(user.id)}
                            className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold cursor-pointer"
                            style={{ backgroundColor: user.avatarColor || '#1877F2' }}
                          >
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                            ) : user.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h4 
                                onClick={() => onUserClick?.(user.id)}
                                className="font-bold text-brand-ink hover:underline cursor-pointer"
                            >
                                {user.name}
                            </h4>
                          </div>
                        </div>
                        {isFriend ? (
                          <div className="flex items-center gap-1 text-[#1877F2] font-bold text-sm bg-[#E7F3FF] px-3 py-1.5 rounded-lg">
                            <UserCheck size={16} />
                            <span>Friends</span>
                          </div>
                        ) : isPending ? (
                          <div className="text-gray-500 font-bold text-sm bg-gray-100 px-3 py-1.5 rounded-lg">
                            Pending
                          </div>
                        ) : (
                          <button 
                            onClick={() => handleFriendRequest(user.id, 'send')}
                            className="flex items-center gap-1 bg-[#1877F2] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-[#166fe5]"
                          >
                            <UserPlus size={16} />
                            <span>Add Friend</span>
                          </button>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-16 px-4"
                >
                  <ChefHat className="mx-auto mb-6 text-brand-olive opacity-20" size={64} strokeWidth={1.5} />
                  <h3 className="text-2xl font-serif mb-3">Meet the Savoria Community</h3>
                  <p className="text-sm text-brand-ink-muted italic mb-8 max-w-xs mx-auto">
                    From home cooks to professional chefs, our community is full of inspiration. Search and follow others to build your feed.
                  </p>
                  <div className="text-[10px] font-bold uppercase tracking-[0.3em] text-brand-ink-subtle">
                    Try searching for common names or ingredients
                  </div>
                </motion.div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
