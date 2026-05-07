import React, { useState, useRef } from 'react';
import { motion } from 'motion/react';
import { UserProfileData } from '../types';
import { User, Camera, Palette, Check, ArrowLeft, Loader2, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface UserProfileProps {
  profile: UserProfileData;
  onUpdate: (updates: Partial<UserProfileData>) => void;
  onBack: () => void;
  onDeleteHistory?: () => void;
  onLogout?: () => void;
}

const AVATAR_COLORS = [
  '#5A5A40', // Brand Olive
  '#F27D26', // Brand Clay
  '#141414', // Brand Ink
  '#4A90E2', // Blue
  '#E24A4A', // Red
  '#4AE28D', // Green
  '#9B4AE2', // Purple
  '#E24AB4', // Pink
];

export default function UserProfile({ profile, onUpdate, onBack, onDeleteHistory, onLogout }: UserProfileProps) {
  const [name, setName] = useState(profile.name);
  const [selectedColor, setSelectedColor] = useState(profile.avatarColor || AVATAR_COLORS[0]);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate({ name, avatarColor: selectedColor, avatarUrl });
    setIsSaving(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile.id) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.id}-${Math.random()}.${fileExt}`;
      const filePath = `${profile.id}/avatars/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profiles')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get Public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profiles')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error);
      if (error.message?.includes('Bucket not found')) {
        alert('Supabase Storage bucket "profiles" not found. Please create a PUBLIC bucket named "profiles" in your Supabase Dashboard -> Storage to enable image uploads.');
      } else {
        alert(`Failed to upload image: ${error.message || 'Unknown error'}`);
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-brand-ink-muted hover:text-brand-ink transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <button 
          onClick={() => {
            if (confirm('Are you sure you want to log out?')) {
              onLogout?.();
            }
          }}
          className="flex items-center gap-2 text-red-500 hover:text-red-600 transition-colors font-bold uppercase tracking-widest text-xs"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>

      <div className="card p-8 md:p-12">
        <div className="flex flex-col items-center mb-12">
          <div className="relative mb-6 group">
            <div 
              className="w-32 h-32 rounded-full flex items-center justify-center text-white text-5xl font-bold shadow-2xl transition-all duration-500 overflow-hidden border-4 border-white ring-1 ring-black/5"
              style={{ backgroundColor: selectedColor }}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                name.charAt(0).toUpperCase()
              )}
              {isUploading && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" size={32} />
                </div>
              )}
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-brand-olive p-3 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform text-white"
              disabled={isUploading}
            >
              <Camera size={20} />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>
          <h2 className="text-3xl font-serif">Your Profile</h2>
          <p className="text-base font-bold text-brand-ink-subtle">{profile.email}</p>
          <div className="mt-4 px-3 py-1 bg-brand-olive/10 text-brand-olive text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-brand-olive rounded-full animate-pulse" />
            Public Profile Active
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Display Name</label>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-brand-ink-subtle" size={20} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-14 pr-6 py-4 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all font-medium"
                placeholder="Enter your name"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-4">Avatar Color</label>
            <div className="flex flex-wrap gap-4">
              {AVATAR_COLORS.map(color => (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className="w-10 h-10 rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-sm border-2 border-white ring-1 ring-black/5"
                  style={{ backgroundColor: color }}
                >
                  {selectedColor === color && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-8 border-t border-black/5 dark:border-white/5">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 disabled:opacity-50 shadow-lg shadow-brand-olive/20"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="pt-10 mt-10 border-t-2 border-red-500/10">
            <div className="bg-red-50 dark:bg-red-950/20 rounded-3xl p-6 border border-red-100 dark:border-red-900/30">
              <h3 className="text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                Danger Zone
              </h3>
              <p className="text-sm text-red-700/70 dark:text-red-300/60 mb-6 font-medium">
                Resetting your account data will permanently remove all your cooking milestones, neighborhood activity, and feedbacks. This action cannot be reversed.
              </p>
              <button 
                onClick={() => {
                  if (confirm('Are you absolutely sure? This will permanently delete all your cooking history and feedbacks. This action is irreversible.')) {
                    onDeleteHistory?.();
                  }
                }}
                className="w-full py-4 text-xs font-bold uppercase tracking-widest text-white bg-red-600 hover:bg-red-700 rounded-2xl transition-all shadow-lg shadow-red-600/20 flex items-center justify-center gap-2"
              >
                Clear History & Feedbacks
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
