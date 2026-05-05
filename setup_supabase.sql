-- 1. EXTEND TABLES
-- Ensure newsfeed exists
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

-- Ensure newsfeed has all required metrics
ALTER TABLE public.newsfeed ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE public.newsfeed ADD COLUMN IF NOT EXISTS comments_count INTEGER DEFAULT 0;
ALTER TABLE public.newsfeed ADD COLUMN IF NOT EXISTS user_avatar_url TEXT;

-- Initialize null columns
UPDATE public.newsfeed SET likes_count = 0 WHERE likes_count IS NULL;
UPDATE public.newsfeed SET comments_count = 0 WHERE comments_count IS NULL;

-- Profiles extension
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#1877F2';

-- 2. CORE TABLES
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

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
    media_type TEXT DEFAULT 'text',
    read BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false,
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

CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- 3. REALTIME ENABLEMENT
-- Drop before add if already exists from previous runs
BEGIN;
  DO $$
  BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
      CREATE PUBLICATION supabase_realtime;
    END IF;
  END $$;

  ALTER PUBLICATION supabase_realtime ADD TABLE newsfeed;
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  ALTER PUBLICATION supabase_realtime ADD TABLE conversations;
  ALTER PUBLICATION supabase_realtime ADD TABLE messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE post_comments;
  ALTER PUBLICATION supabase_realtime ADD TABLE post_likes;
  ALTER PUBLICATION supabase_realtime ADD TABLE friendships;
EXCEPTION WHEN OTHERS THEN
  -- Handle tables already in publication
  RAISE NOTICE 'Some tables might already be in publication';
END;
COMMIT;

-- 4. TRIGGERS
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

-- 5. RLS POLICIES
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Allow all for authenticated for simplicity (adjust for production)
CREATE POLICY "Manage own likes" ON public.post_likes FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "See all likes" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage own comments" ON public.post_comments FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "See all comments" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Manage conversations" ON public.conversations FOR ALL TO authenticated USING (auth.uid() = ANY(participant_ids));
CREATE POLICY "Manage messages" ON public.messages FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.conversations WHERE id = messages.conversation_id AND auth.uid() = ANY(participant_ids)));
CREATE POLICY "Manage friendships" ON public.friendships FOR ALL TO authenticated USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "Manage blocks" ON public.blocks FOR ALL TO authenticated USING (auth.uid() = blocker_id);
CREATE POLICY "See blocks" ON public.blocks FOR SELECT TO authenticated USING (true);
