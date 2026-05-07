-- SAVORIA NEIGHBORHOOD - COMPLETE SUPABASE SETUP
-- IMPORTANT: Run this in your Supabase SQL Editor

-- 1. BASE TABLES & EXTENSIONS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    avatar_color TEXT DEFAULT '#5A5A40',
    preferences JSONB DEFAULT '{"diet": "Moderate", "budget": "Moderate", "allergies": [], "cuisines": []}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure replica identity is FULL for Realtime to work perfectly
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- 2. SOCIAL & CONNECTIVITY
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'rejected'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

CREATE TABLE IF NOT EXISTS public.newsfeed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    user_avatar_color TEXT,
    user_avatar_url TEXT,
    type TEXT DEFAULT 'post', -- 'post', 'recipe', 'shared'
    content TEXT,
    recipe_id TEXT,
    recipe_title TEXT,
    recipe_image TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.newsfeed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.newsfeed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    user_name TEXT,
    user_avatar_color TEXT,
    user_avatar_url TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. MESSAGING SYSTEM
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_ids UUID[] NOT NULL,
    last_message JSONB DEFAULT '{}',
    is_restricted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    media_url TEXT,
    media_type TEXT DEFAULT 'text', -- 'text', 'image', 'video'
    read BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. MEAL PLANNING
CREATE TABLE IF NOT EXISTS public.meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    recipe_id TEXT,
    recipe_title TEXT,
    recipe_image TEXT,
    date TEXT, -- format: 'YYYY-MM-DD'
    meal_type TEXT, -- 'Breakfast', 'Lunch', 'Dinner', 'Snack'
    is_meal_prep BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. SAFETY & MODERATION
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- 6. AUTOMATION TRIGGERS
-- Create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, avatar_color)
    VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', NEW.email), '#5A5A40');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Post Likes Count Trigger
CREATE OR REPLACE FUNCTION public.handle_post_like()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.newsfeed SET likes_count = COALESCE(likes_count, 0) + 1 WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.newsfeed SET likes_count = GREATEST(0, COALESCE(likes_count, 0) - 1) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
CREATE TRIGGER on_post_like AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.handle_post_like();

-- Post Comments Count Trigger
CREATE OR REPLACE FUNCTION public.handle_post_comment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.newsfeed SET comments_count = COALESCE(comments_count, 0) + 1 WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.newsfeed SET comments_count = GREATEST(0, COALESCE(comments_count, 0) - 1) WHERE id = OLD.post_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_post_comment ON public.post_comments;
CREATE TRIGGER on_post_comment AFTER INSERT OR DELETE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.handle_post_comment();

-- 7. REALTIME ENABLEMENT
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  ALTER PUBLICATION supabase_realtime ADD TABLE newsfeed;
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
  ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
  ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
  ALTER PUBLICATION supabase_realtime ADD TABLE meal_plans;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Handled Realtime publication assignment';
END;
COMMIT;

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsfeed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Policies for Newsfeed
CREATE POLICY "Newsfeed is viewable by everyone" ON public.newsfeed FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create posts" ON public.newsfeed FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage own posts" ON public.newsfeed FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Policies for Friendships
CREATE POLICY "Manage friendships" ON public.friendships FOR ALL TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Policies for Conversations
CREATE POLICY "See conversations" ON public.conversations FOR SELECT TO authenticated USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Create conversations" ON public.conversations FOR INSERT TO authenticated WITH CHECK (auth.uid() = ANY(participant_ids));
CREATE POLICY "Update conversations" ON public.conversations FOR UPDATE TO authenticated USING (auth.uid() = ANY(participant_ids));

-- Policies for Messages
CREATE POLICY "See messages" ON public.messages FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations WHERE id = messages.conversation_id AND auth.uid() = ANY(participant_ids)));

-- USER REQUESTED FIX: Send messages restricted to participants
CREATE POLICY "Users can send messages into their conversations" 
ON public.messages 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() = sender_id AND
  EXISTS (
    SELECT 1 FROM public.conversations 
    WHERE id = messages.conversation_id 
    AND auth.uid() = ANY(participant_ids)
  )
);

CREATE POLICY "Manage own messages" ON public.messages FOR UPDATE TO authenticated USING (auth.uid() = sender_id);
CREATE POLICY "Delete own messages" ON public.messages FOR DELETE TO authenticated USING (auth.uid() = sender_id);

-- Policies for Likes & Comments
CREATE POLICY "Manage own likes" ON public.post_likes FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "See all likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage own comments" ON public.post_comments FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "See all comments" ON public.post_comments FOR SELECT TO authenticated USING (true);

-- Policies for Meal Plans
CREATE POLICY "Users can manage own meal plans" ON public.meal_plans FOR ALL TO authenticated USING (auth.uid() = user_id);

-- Policies for Blocks
CREATE POLICY "Manage blocks" ON public.blocks FOR ALL TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "See blocks" ON public.blocks FOR SELECT TO authenticated USING (true);

-- 9. STORAGE BUCKETS & POLICIES
-- NOTE: Please ensure buckets 'profiles' and 'assets' are created in the Dashboard with Public access.
-- If not, run: INSERT INTO storage.buckets (id, name, public) VALUES ('profiles', 'profiles', true), ('assets', 'assets', true) ON CONFLICT DO NOTHING;

-- USER REQUESTED STORAGE FIX: Avatar upload restricted to owner folder
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (bucket_id = 'profiles' AND (storage.foldername(name))[1] = auth.uid()::text);

-- USER REQUESTED STORAGE FIX: Public select for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT 
USING (bucket_id = 'profiles');

-- Broad policies for Assets (General app assets and message media)
CREATE POLICY "Asset images are publicly accessible" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
CREATE POLICY "Asset upload restricted to authenticated" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'assets');
CREATE POLICY "Asset delete restricted to owner" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'assets');

-- 10. REPLICA IDENTITY (Crucial for Realtime)
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.newsfeed REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.post_comments REPLICA IDENTITY FULL;
ALTER TABLE public.friendships REPLICA IDENTITY FULL;
ALTER TABLE public.meal_plans REPLICA IDENTITY FULL;
