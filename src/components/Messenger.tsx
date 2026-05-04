import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Message, Conversation, UserProfileData } from '../types';
import { Search, Send, Image as ImageIcon, Video, ArrowLeft, MoreVertical, Paperclip, Smile, MessageSquare } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MessengerProps {
  currentUser: UserProfileData;
  onClose?: () => void;
  onUserClick?: (userId: string) => void;
}

export default function Messenger({ currentUser, onClose, onUserClick }: MessengerProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to conversations list changes
    const convSubscription = supabase
      .channel('messenger:conversations')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'conversations'
      }, (payload: any) => {
        // Filter in JS since array filters aren't supported in Realtime yet
        if (payload.new && payload.new.participant_ids?.includes(currentUser.id)) {
          if (payload.eventType === 'INSERT') {
            setConversations(prev => [payload.new as Conversation, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setConversations(prev => prev.map(c => c.id === payload.new.id ? { ...c, ...payload.new } : c).sort((a, b) => 
              new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            ));
          }
        }
      })
      .subscribe();

    // Subscribe to messages in active conversation
    let subscription: any;
    if (activeConversation) {
      subscription = supabase
        .channel(`conversation:${activeConversation.id}`)
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `conversation_id=eq.${activeConversation.id}`
        }, (payload) => {
          const newMessage = payload.new as Message;
          setMessages(prev => [...prev, newMessage]);
        })
        .subscribe();
    }

    return () => {
      supabase.removeChannel(convSubscription);
      if (subscription) supabase.removeChannel(subscription);
    };
  }, [activeConversation]);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);
    try {
      if (currentUser.id.startsWith('guest-')) {
        setConversations([
          {
            id: 'mock-1',
            participant_ids: [currentUser.id, 'ai-chef'],
            last_message: {
              content: 'Welcome to Savoria Messenger! How can I help you today?',
              sender_id: 'ai-chef',
              created_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString(),
            participants: [
              currentUser,
              { id: 'ai-chef', name: 'AI Chef', email: 'ai@savoria.app', avatarColor: '#5A5A40' }
            ]
          }
        ]);
        setLoading(false);
        return;
      }

      const { data, error: fetchErr } = await supabase
        .from('conversations')
        .select('*')
        .contains('participant_ids', [currentUser.id])
        .order('updated_at', { ascending: false });

      if (fetchErr) {
        if (fetchErr.code === 'PGRST116') {
          setConversations([]);
        } else if (fetchErr.message?.includes('relation') || fetchErr.message?.includes('does not exist')) {
          setError('Messenger database is not ready. Please run the setup script.');
        } else {
          setError('Failed to load your chats. Check your network.');
        }
        return;
      }

      if (data && data.length > 0) {
        // Fetch all profiles for all participants in all conversations
        const allParticipantIds = Array.from(new Set(data.flatMap((c: any) => c.participant_ids)));
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, name, avatar_url, avatar_color')
          .in('id', allParticipantIds);
        
        const conversationsWithParticipants = data.map((conv: any) => ({
          ...conv,
          participants: conv.participant_ids.map((pId: string) => 
            profiles?.find((p: any) => p.id === pId) || { id: pId, name: 'User', avatarColor: '#1877F2' }
          )
        }));
        
        setConversations(conversationsWithParticipants);
      } else {
        setConversations([]);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('An unexpected error occurred in Messenger.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (convId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (err) {
      console.error('Error fetching messages:', err);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !activeConversation) return;

    const messageContent = newMessage;
    setNewMessage('');

    try {
      const { error: sendErr } = await supabase.from('messages').insert({
        conversation_id: activeConversation.id,
        sender_id: currentUser.id,
        content: messageContent,
        read: false
      });

      if (sendErr) {
        setError('Message failed to send. Try again.');
        throw sendErr;
      }

      // Update conversation last message
      await supabase.from('conversations').update({
        last_message: {
          content: messageContent,
          sender_id: currentUser.id,
          created_at: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }).eq('id', activeConversation.id);

    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversation) return;

    if (currentUser.id.startsWith('guest-')) {
      alert("Please sign in to upload files.");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `messages/${activeConversation.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filePath);

      await supabase.from('messages').insert({
        conversation_id: activeConversation.id,
        sender_id: currentUser.id,
        content: '',
        media_url: publicUrl,
        media_type: file.type.startsWith('video') ? 'video' : 'image',
        read: false
      });

    } catch (err) {
      console.error('Error uploading file:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const getOtherParticipant = (conv: Conversation): UserProfileData => {
    return conv.participants?.find(p => p.id !== currentUser.id) || { 
      id: 'unknown',
      name: 'User', 
      email: '',
      avatarColor: '#1877F2' 
    };
  };

  return (
    <div className="flex h-[calc(100vh-140px)] bg-white dark:bg-brand-ink/5 rounded-xl shadow-xl overflow-hidden border border-black/5 dark:border-white/5">
      {/* Conversations List */}
      <div className={`${activeConversation ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-black/5 dark:border-white/5`}>
        <div className="p-4 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-brand-ink">Chats</h2>
            <button className="p-2 hover:bg-gray-100 dark:hover:bg-brand-ink/10 rounded-full">
              <MoreVertical size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search Messenger"
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-brand-ink/20 border-none rounded-full text-sm focus:ring-1 focus:ring-[#1877F2]"
            />
          </div>
        </div>

        <div className="flex-grow overflow-y-auto">
          {error && (
            <div className="m-3 p-3 bg-red-50 text-red-600 rounded-lg text-xs font-bold border border-red-100 flex items-center gap-2">
              <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowLeft size={12} className="rotate-90" />
              </div>
              {error}
            </div>
          )}
          {loading ? (
            <div className="p-4 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-brand-ink/10" />
                  <div className="flex-grow space-y-2">
                    <div className="h-4 w-24 bg-gray-200 dark:bg-brand-ink/10 rounded" />
                    <div className="h-3 w-40 bg-gray-200 dark:bg-brand-ink/10 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-8 text-center text-gray-500 italic">
              <p>No conversations yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-black/5">
              {conversations.map((conv) => {
                const otherUser = getOtherParticipant(conv);
                return (
                  <div 
                    key={conv.id}
                    onClick={() => {
                      setActiveConversation(conv);
                      fetchMessages(conv.id);
                    }}
                    className={`p-3 flex gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-brand-ink/10 transition-colors ${activeConversation?.id === conv.id ? 'bg-[#E7F3FF] dark:bg-brand-ink/20' : ''}`}
                  >
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        onUserClick?.(otherUser.id);
                      }}
                      className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: otherUser.avatarColor || '#1877F2' }}
                    >
                      {otherUser.avatarUrl ? (
                        <img src={otherUser.avatarUrl} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                      ) : otherUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-grow overflow-hidden">
                      <div className="flex justify-between items-baseline">
                        <h4 
                          onClick={(e) => {
                            e.stopPropagation();
                            onUserClick?.(otherUser.id);
                          }}
                          className="font-bold text-sm text-brand-ink truncate hover:underline"
                        >
                          {otherUser.name}
                        </h4>
                        <span className="text-[10px] text-gray-500">{conv.last_message ? new Date(conv.last_message.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' }) : ''}</span>
                      </div>
                      <p className="text-xs text-gray-500 truncate mt-1">
                        {conv.last_message ? (
                          <>
                            {conv.last_message.sender_id === currentUser.id ? 'You: ' : ''}
                            {conv.last_message.content}
                          </>
                        ) : 'Start a conversation'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className={`${!activeConversation ? 'hidden md:flex' : 'flex'} flex-col flex-grow relative`}>
        {activeConversation ? (
          <>
            {/* Header */}
            <div className="p-3 border-b border-black/5 dark:border-white/5 flex items-center gap-3">
              <button 
                onClick={() => setActiveConversation(null)}
                className="md:hidden p-2 hover:bg-gray-100 rounded-full"
              >
                <ArrowLeft size={20} />
              </button>
              <div 
                onClick={() => onUserClick?.(getOtherParticipant(activeConversation).id)}
                className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80 transition-opacity"
                style={{ backgroundColor: getOtherParticipant(activeConversation).avatarColor || '#1877F2' }}
              >
                {getOtherParticipant(activeConversation).avatarUrl ? (
                  <img src={getOtherParticipant(activeConversation).avatarUrl} className="w-full h-full rounded-full object-cover" alt="" referrerPolicy="no-referrer" />
                ) : getOtherParticipant(activeConversation).name.charAt(0).toUpperCase()}
              </div>
              <div className="cursor-pointer" onClick={() => onUserClick?.(getOtherParticipant(activeConversation).id)}>
                <h4 className="font-bold text-brand-ink hover:underline">{getOtherParticipant(activeConversation).name}</h4>
                <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">Active now</p>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-brand-ink/5">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                  <div 
                    className="w-20 h-20 rounded-full flex items-center justify-center text-white text-3xl font-bold"
                    style={{ backgroundColor: getOtherParticipant(activeConversation).avatarColor || '#1877F2' }}
                  >
                    {getOtherParticipant(activeConversation).name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-brand-ink">{getOtherParticipant(activeConversation).name}</h3>
                    <p className="text-sm text-gray-500">You're friends on Savoria</p>
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => {
                  const isMine = msg.sender_id === currentUser.id;
                  const prevMsg = i > 0 ? messages[i-1] : null;
                  const showAvatar = !isMine && (!prevMsg || prevMsg.sender_id !== msg.sender_id);

                  return (
                    <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-1`}>
                      {!isMine && (
                        <div className="w-8 mr-2 flex-shrink-0">
                          {showAvatar && (
                            <div 
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs"
                              style={{ backgroundColor: getOtherParticipant(activeConversation).avatarColor || '#1877F2' }}
                            >
                              {getOtherParticipant(activeConversation).name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'} flex flex-col`}>
                        {msg.content && (
                          <div className={`px-3 py-2 rounded-2xl text-sm ${
                            isMine 
                            ? 'bg-[#1877F2] text-white rounded-tr-none' 
                            : 'bg-gray-200 dark:bg-brand-ink/20 text-brand-ink rounded-tl-none'
                          }`}>
                            {msg.content}
                          </div>
                        )}
                        {msg.media_url && (
                          <div className={`rounded-xl overflow-hidden mt-1 border border-black/5 ${isMine ? 'rounded-tr-none' : 'rounded-tl-none'}`}>
                            {msg.media_type === 'video' ? (
                              <video src={msg.media_url} controls className="max-w-full max-h-60" />
                            ) : (
                              <img src={msg.media_url} alt="" className="max-w-full max-h-60 object-cover" referrerPolicy="no-referrer" />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 border-t border-black/5 dark:border-white/5 space-y-3">
              {isUploading && (
                <div className="flex items-center gap-2 text-xs text-brand-olive font-bold">
                  <div className="w-3 h-3 border-2 border-brand-olive border-t-transparent rounded-full animate-spin" />
                  <span>Uploading media...</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-brand-olive hover:bg-gray-100 dark:hover:bg-brand-ink/10 rounded-full"
                    title="Attach file"
                  >
                    <Paperclip size={20} />
                  </button>
                  <button 
                    className="p-2 text-brand-olive hover:bg-gray-100 dark:hover:bg-brand-ink/10 rounded-full"
                    title="Send image"
                    onClick={() => {
                        if (fileInputRef.current) {
                            fileInputRef.current.accept = "image/*";
                            fileInputRef.current.click();
                        }
                    }}
                  >
                    <ImageIcon size={20} />
                  </button>
                  <button 
                    className="p-2 text-brand-olive hover:bg-gray-100 dark:hover:bg-brand-ink/10 rounded-full"
                    title="Send video"
                    onClick={() => {
                        if (fileInputRef.current) {
                            fileInputRef.current.accept = "video/*";
                            fileInputRef.current.click();
                        }
                    }}
                  >
                    <Video size={20} />
                  </button>
                </div>

                <form onSubmit={handleSendMessage} className="flex-grow flex gap-2">
                  <div className="flex-grow relative">
                    <input 
                      type="text" 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Aa"
                      className="w-full px-4 py-2 bg-gray-100 dark:bg-brand-ink/20 border-none rounded-full text-[15px] focus:ring-1 focus:ring-[#1877F2]"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-olive opacity-60 hover:opacity-100">
                      <Smile size={18} />
                    </button>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                  <button 
                    type="submit"
                    disabled={!newMessage.trim() && !isUploading}
                    className="p-2 text-[#1877F2] hover:scale-110 transition-transform disabled:opacity-30"
                  >
                    <Send size={24} fill="currentColor" />
                  </button>
                </form>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
            <div className="bg-[#1877F2]/10 p-6 rounded-full">
              <MessageSquare size={48} className="text-[#1877F2]" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-brand-ink">No Chat Selected</h3>
              <p className="text-sm text-gray-500 max-w-xs">Select a conversation or start a new one with your friends.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
