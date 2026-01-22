-- Add discord_id column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN discord_id text,
ADD COLUMN discord_username text;