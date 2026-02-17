-- Add video_url column to products table for product demo videos
-- Supports YouTube, Vimeo, or direct video URLs (MP4 from Cloudinary, S3, etc.)
ALTER TABLE products ADD COLUMN IF NOT EXISTS video_url TEXT;
