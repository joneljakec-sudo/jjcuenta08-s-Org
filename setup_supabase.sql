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

-- 2a. Post Comments Table
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.newsfeed(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  user_avatar_color TEXT,
  user_avatar_url TEXT,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2b. Post Likes Table (to track who liked what)
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID REFERENCES public.newsfeed(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Function to update counts in Newsfeed
CREATE OR REPLACE FUNCTION public.update_newsfeed_counts()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        IF (TG_TABLE_NAME = 'post_comments') THEN
            UPDATE public.newsfeed SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        ELSIF (TG_TABLE_NAME = 'post_likes') THEN
            UPDATE public.newsfeed SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        IF (TG_TABLE_NAME = 'post_comments') THEN
            UPDATE public.newsfeed SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
        ELSIF (TG_TABLE_NAME = 'post_likes') THEN
            UPDATE public.newsfeed SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for counts
CREATE TRIGGER on_comment_added AFTER INSERT ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.update_newsfeed_counts();
CREATE TRIGGER on_comment_removed AFTER DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.update_newsfeed_counts();
CREATE TRIGGER on_like_added AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.update_newsfeed_counts();
CREATE TRIGGER on_like_removed AFTER DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.update_newsfeed_counts();

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
  last_message JSONB,
  is_restricted BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  media_url TEXT,
  media_type TEXT DEFAULT 'text',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4a. Blocks Table
CREATE TABLE IF NOT EXISTS public.blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
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
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
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

    -- Post Comments
    DROP POLICY IF EXISTS "Comments are viewable by everyone." ON public.post_comments;
    CREATE POLICY "Comments are viewable by everyone." ON public.post_comments FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Users can insert their own comments." ON public.post_comments;
    CREATE POLICY "Users can insert their own comments." ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can delete their own comments." ON public.post_comments;
    CREATE POLICY "Users can delete their own comments." ON public.post_comments FOR DELETE USING (auth.uid() = user_id);

    -- Post Likes
    DROP POLICY IF EXISTS "Likes are viewable by everyone." ON public.post_likes;
    CREATE POLICY "Likes are viewable by everyone." ON public.post_likes FOR SELECT USING (true);
    
    DROP POLICY IF EXISTS "Users can insert their own likes." ON public.post_likes;
    CREATE POLICY "Users can insert their own likes." ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
    
    DROP POLICY IF EXISTS "Users can delete their own likes." ON public.post_likes;
    CREATE POLICY "Users can delete their own likes." ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

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
    
    DROP POLICY IF EXISTS "Users can update their own conversations." ON public.conversations;
    CREATE POLICY "Users can update their own conversations." ON public.conversations FOR UPDATE USING (auth.uid() = ANY(participant_ids));

    -- Messages
    DROP POLICY IF EXISTS "Users can view messages in their conversations." ON public.messages;
    CREATE POLICY "Users can view messages in their conversations." ON public.messages FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = messages.conversation_id 
        AND auth.uid() = ANY(participant_ids)
      )
    );

    DROP POLICY IF EXISTS "Users can insert messages if not blocked." ON public.messages;
    CREATE POLICY "Users can insert messages if not blocked." ON public.messages FOR INSERT WITH CHECK (
      auth.uid() = sender_id AND
      NOT EXISTS (
        SELECT 1 FROM public.blocks
        WHERE (blocker_id = ANY(ARRAY(SELECT unnest(participant_ids) FROM public.conversations WHERE id = conversation_id)) AND blocked_id = auth.uid())
      )
    );

    DROP POLICY IF EXISTS "Users can delete their own messages." ON public.messages;
    CREATE POLICY "Users can delete their own messages." ON public.messages FOR UPDATE USING (auth.uid() = sender_id);

    -- Blocks
    DROP POLICY IF EXISTS "Users can view their own blocks." ON public.blocks;
    CREATE POLICY "Users can view their own blocks." ON public.blocks FOR SELECT USING (auth.uid() = blocker_id OR auth.uid() = blocked_id);

    DROP POLICY IF EXISTS "Users can manage their own blocks." ON public.blocks;
    CREATE POLICY "Users can manage their own blocks." ON public.blocks FOR ALL USING (auth.uid() = blocker_id);
END $$;

-- ENABLE REALTIME
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE public.newsfeed, public.messages, public.conversations, public.friendships, public.notifications, public.post_comments, public.post_likes;
