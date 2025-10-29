-- ================================================
-- Brain Dump App - Complete Database Schema
-- ================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ================================================
-- PROFILES TABLE (User Data)
-- ================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Trigger to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- THOUGHTS TABLE
-- ================================================
CREATE TABLE public.thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  title TEXT NOT NULL,
  snippet TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  embedding vector(768),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.thoughts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for thoughts
CREATE POLICY "Users can view their own thoughts"
  ON public.thoughts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own thoughts"
  ON public.thoughts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own thoughts"
  ON public.thoughts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own thoughts"
  ON public.thoughts FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for thoughts
CREATE INDEX idx_thoughts_user_id ON public.thoughts(user_id);
CREATE INDEX idx_thoughts_status ON public.thoughts(status);
CREATE INDEX idx_thoughts_is_completed ON public.thoughts(is_completed);
CREATE INDEX idx_thoughts_created_at ON public.thoughts(created_at DESC);
CREATE INDEX idx_thoughts_embedding ON public.thoughts USING ivfflat (embedding vector_cosine_ops);

-- ================================================
-- CATEGORIES TABLE
-- ================================================
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
CREATE POLICY "Users can view their own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for categories
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_name ON public.categories(name);

-- ================================================
-- CLUSTERS TABLE
-- ================================================
CREATE TABLE public.clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_manual BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.clusters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for clusters
CREATE POLICY "Users can view their own clusters"
  ON public.clusters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own clusters"
  ON public.clusters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clusters"
  ON public.clusters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clusters"
  ON public.clusters FOR DELETE
  USING (auth.uid() = user_id);

-- Indexes for clusters
CREATE INDEX idx_clusters_user_id ON public.clusters(user_id);
CREATE INDEX idx_clusters_created_at ON public.clusters(created_at DESC);

-- ================================================
-- THOUGHT_CATEGORIES JUNCTION TABLE
-- ================================================
CREATE TABLE public.thought_categories (
  thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (thought_id, category_id)
);

ALTER TABLE public.thought_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for thought_categories
CREATE POLICY "Users can view their own thought categories"
  ON public.thought_categories FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_categories.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own thought categories"
  ON public.thought_categories FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_categories.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own thought categories"
  ON public.thought_categories FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_categories.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

-- Indexes for thought_categories
CREATE INDEX idx_thought_categories_thought_id ON public.thought_categories(thought_id);
CREATE INDEX idx_thought_categories_category_id ON public.thought_categories(category_id);

-- ================================================
-- THOUGHT_CLUSTERS JUNCTION TABLE
-- ================================================
CREATE TABLE public.thought_clusters (
  thought_id UUID NOT NULL REFERENCES public.thoughts(id) ON DELETE CASCADE,
  cluster_id UUID NOT NULL REFERENCES public.clusters(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  PRIMARY KEY (thought_id, cluster_id)
);

ALTER TABLE public.thought_clusters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for thought_clusters
CREATE POLICY "Users can view their own thought clusters"
  ON public.thought_clusters FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_clusters.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own thought clusters"
  ON public.thought_clusters FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_clusters.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own thought clusters"
  ON public.thought_clusters FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.thoughts
      WHERE thoughts.id = thought_clusters.thought_id
      AND thoughts.user_id = auth.uid()
    )
  );

-- Indexes for thought_clusters
CREATE INDEX idx_thought_clusters_thought_id ON public.thought_clusters(thought_id);
CREATE INDEX idx_thought_clusters_cluster_id ON public.thought_clusters(cluster_id);

-- ================================================
-- DATABASE FUNCTIONS
-- ================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_thoughts_updated_at
  BEFORE UPDATE ON public.thoughts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clusters_updated_at
  BEFORE UPDATE ON public.clusters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to add category to thought (used by queries.ts)
CREATE OR REPLACE FUNCTION public.add_category_to_thought(
  p_thought_id UUID,
  p_category_name TEXT,
  p_user_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_id UUID;
BEGIN
  -- Get or create category
  SELECT id INTO v_category_id
  FROM public.categories
  WHERE user_id = p_user_id AND name = p_category_name;

  IF v_category_id IS NULL THEN
    INSERT INTO public.categories (user_id, name)
    VALUES (p_user_id, p_category_name)
    RETURNING id INTO v_category_id;
  END IF;

  -- Link thought to category (ignore if already exists)
  INSERT INTO public.thought_categories (thought_id, category_id)
  VALUES (p_thought_id, v_category_id)
  ON CONFLICT (thought_id, category_id) DO NOTHING;

  RETURN v_category_id;
END;
$$;