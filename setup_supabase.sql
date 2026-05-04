-- SQL to set up the entire database for the Smart Meal Planner
-- Run this in your Supabase SQL Editor

-- Profiles Table (Users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  avatar_url TEXT,
  avatar_color TEXT,
  preferences JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User Recipes Table (Shared by users)
CREATE TABLE IF NOT EXISTS public.user_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  user_name TEXT,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites Table
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, recipe_id)
);

-- Notifications Table
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

-- Newsfeed Table (Meal Swap)
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

-- Comments Table
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.newsfeed(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar_color TEXT,
  user_avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Conversations Table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  participant_ids UUID[] NOT NULL,
  last_message TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  type TEXT DEFAULT 'text', -- 'text', 'image', 'recipe'
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Friendships Table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(sender_id, receiver_id)
);

-- Meal Plans Table
CREATE TABLE IF NOT EXISTS public.meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id TEXT NOT NULL,
  recipe_title TEXT,
  recipe_image TEXT,
  date TEXT NOT NULL, -- Format: YYYY-MM-DD
  meal_type TEXT NOT NULL, -- Breakfast, Lunch, Dinner, Snack
  is_meal_prep BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Global Recipes Cache (Optional optimization)
CREATE TABLE IF NOT EXISTS public.global_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  diet TEXT,
  budget TEXT,
  title TEXT UNIQUE,
  recipe_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsfeed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.global_recipes ENABLE ROW LEVEL SECURITY;

-- ENABLE REALTIME (Run this to enable live updates for chats and newsfeed)
-- In Supabase, these tables will now broadcast changes to the app
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsfeed;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- POLICIES

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile." ON profiles;
DROP POLICY IF EXISTS "Users can update own profile." ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by authenticated users." ON profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Profiles are viewable by authenticated users." ON profiles FOR SELECT TO authenticated USING (true);

-- User Recipes
DROP POLICY IF EXISTS "Recipes are viewable by everyone." ON user_recipes;
DROP POLICY IF EXISTS "Users can insert their own recipes." ON user_recipes;
DROP POLICY IF EXISTS "Users can update their own recipes." ON user_recipes;
DROP POLICY IF EXISTS "Users can delete their own recipes." ON user_recipes;
CREATE POLICY "Recipes are viewable by everyone." ON user_recipes FOR SELECT USING (true);
CREATE POLICY "Users can insert their own recipes." ON user_recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own recipes." ON user_recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own recipes." ON user_recipes FOR DELETE USING (auth.uid() = user_id);

-- Reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone." ON reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews." ON reviews;
DROP POLICY IF EXISTS "Users can update their own reviews." ON reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews." ON reviews;
CREATE POLICY "Reviews are viewable by everyone." ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reviews." ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews." ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews." ON reviews FOR DELETE USING (auth.uid() = user_id);

-- Favorites
DROP POLICY IF EXISTS "Users can view their own favorites." ON favorites;
DROP POLICY IF EXISTS "Users can insert their own favorites." ON favorites;
DROP POLICY IF EXISTS "Users can delete their own favorites." ON favorites;
CREATE POLICY "Users can view their own favorites." ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own favorites." ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own favorites." ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Notifications
DROP POLICY IF EXISTS "Users can view their own notifications." ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications." ON notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications." ON notifications;
CREATE POLICY "Users can view their own notifications." ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications." ON notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own notifications." ON notifications FOR DELETE USING (auth.uid() = user_id);

-- Newsfeed
DROP POLICY IF EXISTS "Newsfeed is viewable by everyone." ON newsfeed;
DROP POLICY IF EXISTS "Users can insert their own newsfeed items." ON newsfeed;
DROP POLICY IF EXISTS "Users can update their own newsfeed items." ON newsfeed;
DROP POLICY IF EXISTS "Users can delete their own newsfeed items." ON newsfeed;
CREATE POLICY "Newsfeed is viewable by everyone." ON newsfeed FOR SELECT USING (true);
CREATE POLICY "Users can insert their own newsfeed items." ON newsfeed FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own newsfeed items." ON newsfeed FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own newsfeed items." ON newsfeed FOR DELETE USING (auth.uid() = user_id);

-- Comments
DROP POLICY IF EXISTS "Comments are viewable by everyone." ON comments;
DROP POLICY IF EXISTS "Users can insert their own comments." ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments." ON comments;
CREATE POLICY "Comments are viewable by everyone." ON comments FOR SELECT USING (true);
CREATE POLICY "Users can insert their own comments." ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own comments." ON comments FOR DELETE USING (auth.uid() = user_id);

-- Conversations
DROP POLICY IF EXISTS "Users can view their own conversations." ON conversations;
DROP POLICY IF EXISTS "Users can update their own conversations." ON conversations;
CREATE POLICY "Users can view their own conversations." ON conversations FOR SELECT USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Users can update their own conversations." ON conversations FOR UPDATE USING (auth.uid() = ANY(participant_ids));

-- Messages
DROP POLICY IF EXISTS "Users can view messages in their conversations." ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages." ON messages;
CREATE POLICY "Users can view messages in their conversations." ON messages FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversations 
    WHERE id = messages.conversation_id 
    AND auth.uid() = ANY(participant_ids)
  )
);
CREATE POLICY "Users can insert their own messages." ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Friendships
DROP POLICY IF EXISTS "Users can view their own friendships." ON friendships;
DROP POLICY IF EXISTS "Users can insert their own friendships." ON friendships;
DROP POLICY IF EXISTS "Users can update their own friendships." ON friendships;
CREATE POLICY "Users can view their own friendships." ON friendships FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Users can insert their own friendships." ON friendships FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their own friendships." ON friendships FOR UPDATE USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Meal Plans
DROP POLICY IF EXISTS "Users can view their own meal plans." ON meal_plans;
DROP POLICY IF EXISTS "Users can insert their own meal plans." ON meal_plans;
DROP POLICY IF EXISTS "Users can update their own meal plans." ON meal_plans;
DROP POLICY IF EXISTS "Users can delete their own meal plans." ON meal_plans;
CREATE POLICY "Users can view their own meal plans." ON meal_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own meal plans." ON meal_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own meal plans." ON meal_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own meal plans." ON meal_plans FOR DELETE USING (auth.uid() = user_id);

-- Global Recipes
DROP POLICY IF EXISTS "Global recipes are viewable by everyone." ON global_recipes;
CREATE POLICY "Global recipes are viewable by everyone." ON global_recipes FOR SELECT USING (true);
