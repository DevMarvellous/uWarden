-- uWarden Database Schema
-- Run this in your Supabase SQL Editor

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  work_goal TEXT,
  strictness TEXT DEFAULT 'hard' CHECK (strictness IN ('hard', 'medium', 'easy')),
  onboarding_complete BOOLEAN DEFAULT FALSE,
  is_pro BOOLEAN DEFAULT FALSE
);

-- Blacklists table
CREATE TABLE IF NOT EXISTS blacklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, url)
);

-- Visit logs table
CREATE TABLE IF NOT EXISTS visit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  site_name TEXT NOT NULL,
  roast TEXT,
  visited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  was_overridden BOOLEAN DEFAULT FALSE
);

-- Migration for existing databases: add the roast column if it is missing
ALTER TABLE visit_logs ADD COLUMN IF NOT EXISTS roast TEXT;

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE visit_logs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own blacklist" ON blacklists;
DROP POLICY IF EXISTS "Users can manage their own blacklist" ON blacklists;
DROP POLICY IF EXISTS "Users can view their own visit logs" ON visit_logs;
DROP POLICY IF EXISTS "Users can insert their own visit logs" ON visit_logs;
DROP POLICY IF EXISTS "Users can update their own visit logs" ON visit_logs;

-- Users RLS policies
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can upsert their own profile" ON users
  FOR ALL USING (auth.uid() = id);

-- Blacklists RLS policies
CREATE POLICY "Users can view their own blacklist" ON blacklists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own blacklist" ON blacklists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own blacklist" ON blacklists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own blacklist" ON blacklists
  FOR DELETE USING (auth.uid() = user_id);

-- Visit logs RLS policies
CREATE POLICY "Users can view their own visit logs" ON visit_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visit logs" ON visit_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visit logs" ON visit_logs
  FOR UPDATE USING (auth.uid() = user_id);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_blacklists_user_id ON blacklists(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_user_id ON visit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_visit_logs_visited_at ON visit_logs(visited_at);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE
  ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
