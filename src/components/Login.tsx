import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChefHat, Mail, Lock, Loader2, User, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginProps {
  onLogin: (user: { name: string; email: string; id: string }) => void;
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<AuthMode>('signin');
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const isSupabaseConfigured = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleGuestMode = () => {
    onLogin({
      id: 'guest-' + Math.random().toString(36).substr(2, 9),
      name: 'Guest Chef',
      email: 'guest@example.com',
    });
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              display_name: displayName,
            }
          }
        });
        if (error) throw error;
        if (data.user) {
          if (data.session) {
            onLogin({
              id: data.user.id,
              name: displayName || data.user.email?.split('@')[0] || 'User',
              email: data.user.email || '',
            });
          } else {
            setSuccessMessage('Check your email for a confirmation link!');
          }
        }
      } else if (mode === 'signin') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        if (data.user) {
          onLogin({
            id: data.user.id,
            name: data.user.user_metadata?.display_name || data.user.email?.split('@')[0] || 'User',
            email: data.user.email || '',
          });
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setSuccessMessage('Password reset link sent to your email!');
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let msg = err.message;
      if (msg.includes('invalid url path') || msg.includes('Failed to fetch')) {
        msg = 'Connection error. Please check if VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are correctly set in Settings > Secrets and restart the dev server.';
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-brand-cream">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full card p-10 text-center"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-brand-olive rounded-[20px] flex items-center justify-center mb-4 shadow-xl shadow-brand-olive/20">
            <ChefHat className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-serif font-bold mb-1">
            {mode === 'forgot' ? 'Reset Password' : 'Welcome to Savoria'}
          </h1>
          <p className="text-brand-ink-muted serif italic text-sm">
            {mode === 'forgot' ? 'We\'ll send you a link to get back in.' : 'Your personal AI culinary guide.'}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {successMessage ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl text-center mb-6"
            >
              <CheckCircle2 className="text-emerald-500 mx-auto mb-3" size={32} />
              <p className="text-emerald-800 font-medium text-sm mb-4">{successMessage}</p>
              <button 
                onClick={() => {
                  setSuccessMessage(null);
                  setMode('signin');
                }}
                className="text-emerald-700 text-xs font-bold uppercase tracking-widest hover:underline"
              >
                Back to Sign In
              </button>
            </motion.div>
          ) : (
            <form onSubmit={handleAuth} className="space-y-4 mb-6 text-left">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                >
                  <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-2 ml-1">Display Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink-subtle" size={18} />
                    <input 
                      type="text" 
                      required
                      placeholder="Chef Gordon"
                      className="w-full pl-12 pr-4 py-3 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                    />
                  </div>
                </motion.div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle mb-2 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink-subtle" size={18} />
                  <input 
                    type="email" 
                    required
                    placeholder="you@example.com"
                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>
              
              {mode !== 'forgot' && (
                <div>
                  <div className="flex justify-between items-center mb-2 ml-1">
                    <label className="block text-xs font-bold uppercase tracking-widest text-brand-ink-subtle">Password</label>
                    {mode === 'signin' && (
                      <button 
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-xs font-bold text-brand-olive hover:underline"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-ink-subtle" size={18} />
                    <input 
                      type="password" 
                      required
                      placeholder="••••••••"
                      className="w-full pl-12 pr-4 py-3 bg-white dark:bg-brand-ink/20 border-2 border-black/5 dark:border-white/5 rounded-2xl outline-none focus:border-brand-olive/30 transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-500 text-xs font-medium">
                  {error}
                </div>
              )}

              <button 
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-brand-olive text-white text-base font-bold shadow-lg shadow-brand-olive/20 hover:bg-brand-olive/90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  mode === 'signup' ? 'Create Account' : 
                  mode === 'signin' ? 'Sign In' : 'Send Reset Link'
                )}
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-black/5 dark:border-white/5"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-brand-card px-2 text-brand-ink-subtle font-bold tracking-widest">Or</span>
                </div>
              </div>

              <button 
                type="button"
                onClick={handleGuestMode}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white dark:bg-brand-ink/10 border-2 border-black/5 dark:border-white/5 text-brand-ink text-base font-bold hover:bg-black/5 dark:hover:bg-white/5 transition-all"
              >
                Explore as Guest
              </button>

              {mode === 'forgot' && (
                <button 
                  type="button"
                  onClick={() => setMode('signin')}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-brand-ink-muted hover:text-brand-ink transition-colors mt-2"
                >
                  <ArrowLeft size={14} />
                  Back to Sign In
                </button>
              )}
            </form>
          )}
        </AnimatePresence>

        {mode !== 'forgot' && !successMessage && (
          <>
            <button 
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
              className="mt-8 text-sm font-bold text-brand-olive hover:underline"
            >
              {mode === 'signin' ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
            </button>
          </>
        )}

        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5">
          <p className="text-xs text-brand-ink-subtle leading-relaxed">
            By continuing, you agree to Savoria's <br />
            <span className="underline cursor-pointer">Terms of Service</span> and <span className="underline cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
