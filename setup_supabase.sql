-- SQL to set up the entire database for the Savoria App
-- Run this in your Supabase SQL Editor

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  avatar_color TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Newsfeed Table
CREATE TABLE IF NOT EXISTS public.newsfeed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar_color TEXT,
  user_avatar_url TEXT,
  type TEXT NOT NULL, -- 'post', 'recipe-share'
  content TEXT,
  recipe_id TEXT,
  recipe_title TEXT,
  recipe_image TEXT,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Friendships Table 
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- 4. Conversations & Messages
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_ids UUID[] NOT NULL,
  last_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  type TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. User Recipes Table
CREATE TABLE IF NOT EXISTS public.user_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsfeed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- POLICIES (Drop and Recreate for safety)
DO $$ 
BEGIN
    -- Profiles
    DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
    CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
    CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

    -- Newsfeed
    DROP POLICY IF EXISTS "Newsfeed is viewable by everyone." ON public.newsfeed;
    CREATE POLICY "Newsfeed is viewable by everyone." ON public.newsfeed FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Users can insert their own newsfeed items." ON public.newsfeed;
    CREATE POLICY "Users can insert their own newsfeed items." ON public.newsfeed FOR INSERT WITH CHECK (auth.uid() = user_id);

    -- Friendships
    DROP POLICY IF EXISTS "Users can view their own friendships." ON public.friendships;
    CREATE POLICY "Users can view their own friendships." ON public.friendships FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
    
    DROP POLICY IF EXISTS "Users can insert their own friendships." ON public.friendships;
    CREATE POLICY "Users can insert their own friendships." ON public.friendships FOR INSERT WITH CHECK (auth.uid() = sender_id);
    
    DROP POLICY IF EXISTS "Users can update their own friendships." ON public.friendships;
    CREATE POLICY "Users can update their own friendships." ON public.friendships FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

    -- Conversations
    DROP POLICY IF EXISTS "Users can view their own conversations." ON public.conversations;
    CREATE POLICY "Users can view their own conversations." ON public.conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));

    -- Messages
    DROP POLICY IF EXISTS "Users can view messages in their conversations." ON public.messages;
    CREATE POLICY "Users can view messages in their conversations." ON public.messages FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = messages.conversation_id 
        AND auth.uid() = ANY(participant_ids)
      )
    );
END $$;

-- ENABLE REALTIME
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsfeed, public.messages, public.conversations, public.friendships, public.notifications;
