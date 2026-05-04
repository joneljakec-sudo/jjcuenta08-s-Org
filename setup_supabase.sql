
-- 1. CLEANUP (Optional - run if you want a fresh start)
-- DROP TABLE IF EXISTS post_comments;
-- DROP TABLE IF EXISTS post_likes;
-- DROP TABLE IF EXISTS messages;
-- DROP TABLE IF EXISTS conversations;
-- DROP TABLE IF EXISTS friendships;
-- DROP TABLE IF EXISTS blocks;

-- 2. CREATE CORE TABLES FOR SOCIAL FEATURES

-- Profiles update (ensure it has everything)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_color TEXT DEFAULT '#1877F2';

-- Friendships
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(sender_id, receiver_id)
);

-- Conversations
CREATE TABLE IF NOT EXISTS public.conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    participant_ids UUID[] NOT NULL,
    last_message JSONB DEFAULT '{}',
    is_restricted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages
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

-- Newsfeed Likes
CREATE TABLE IF NOT EXISTS public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID REFERENCES public.newsfeed(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(post_id, user_id)
);

-- Newsfeed Comments
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

-- Blocks
CREATE TABLE IF NOT EXISTS public.blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- 3. ENABLE REALTIME
-- Run these one by one if they fail in a batch
ALTER publication supabase_realtime ADD TABLE newsfeed;
ALTER publication supabase_realtime ADD TABLE notifications;
ALTER publication supabase_realtime ADD TABLE conversations;
ALTER publication supabase_realtime ADD TABLE messages;
ALTER publication supabase_realtime ADD TABLE post_comments;
ALTER publication supabase_realtime ADD TABLE post_likes;
ALTER publication supabase_realtime ADD TABLE friendships;

-- 4. AUTOMATED COUNTERS (TRIGGERS)

-- Sync Likes Count
CREATE OR REPLACE FUNCTION public.handle_post_like()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.newsfeed SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.newsfeed SET likes_count = GREATEST(0, likes_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_post_like ON public.post_likes;
CREATE TRIGGER on_post_like
AFTER INSERT OR DELETE ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.handle_post_like();

-- Sync Comments Count
CREATE OR REPLACE FUNCTION public.handle_post_comment()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.newsfeed SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.newsfeed SET comments_count = GREATEST(0, comments_count - 1) WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_post_comment ON public.post_comments;
CREATE TRIGGER on_post_comment
AFTER INSERT OR DELETE ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.handle_post_comment();

-- 5. RLS POLICIES (GIVE ACCESS)

-- Basic: Everything to authenticated users for now to ensure it works
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;

-- Post Likes Policy
CREATE POLICY "Allow users to manage their own likes" ON public.post_likes
FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow everyone to see likes" ON public.post_likes
FOR SELECT USING (true);

-- Post Comments Policy
CREATE POLICY "Allow users to manage their own comments" ON public.post_comments
FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Allow everyone to see comments" ON public.post_comments
FOR SELECT USING (true);

-- Conversations Policy
CREATE POLICY "Allow users to see their own conversations" ON public.conversations
FOR ALL USING (auth.uid() = ANY(participant_ids));

-- Messages Policy
CREATE POLICY "Allow users to see messages in their conversations" ON public.messages
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.conversations 
        WHERE id = messages.conversation_id 
        AND auth.uid() = ANY(participant_ids)
    )
);

-- Friendships Policy
CREATE POLICY "Allow users to manage their friendships" ON public.friendships
FOR ALL USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Blocks Policy
CREATE POLICY "Allow users to manage their blocks" ON public.blocks
FOR ALL USING (auth.uid() = blocker_id);
CREATE POLICY "Allow everyone to see blocks" ON public.blocks
FOR SELECT USING (true);
