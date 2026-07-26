-- Migration: Add link, funcao, images and updatedAt to events table

-- Add funcao column (default empty string for existing rows)
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "funcao" TEXT NOT NULL DEFAULT '';

-- Add link column (optional URL)
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "link" TEXT;

-- Add images column (PostgreSQL text array)
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "images" TEXT[] NOT NULL DEFAULT '{}';

-- Add updatedAt column
ALTER TABLE "events" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
