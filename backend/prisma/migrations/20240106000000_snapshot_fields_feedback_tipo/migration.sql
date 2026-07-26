-- Migration: snapshot_fields_feedback_tipo
-- Adiciona campos de snapshot (nome/cargo/funcao do funcionário) em tasks e events
-- Adiciona enum FeedbackTipo e campo tipo em events
-- Imagens: imageUrl em city_backgrounds e global_backgrounds passa a aceitar TEXT (data URLs base64)

-- ============================================================
-- ENUM: FeedbackTipo
-- ============================================================
DO $$ BEGIN
  CREATE TYPE "FeedbackTipo" AS ENUM ('POSITIVE', 'NEGATIVE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- TABELA tasks: campos snapshot
-- ============================================================
ALTER TABLE "tasks"
  ADD COLUMN IF NOT EXISTS "employeeSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "cargoSnapshot"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "funcaoSnapshot"   TEXT NOT NULL DEFAULT '';

-- Preencher snapshots dos registros existentes com dados do funcionário atual
UPDATE "tasks" t
SET
  "employeeSnapshot" = COALESCE(e.name,  ''),
  "cargoSnapshot"    = COALESCE(e.cargo, ''),
  "funcaoSnapshot"   = COALESCE(e.funcao,'')
FROM "employees" e
WHERE t."employeeId" = e.id
  AND t."employeeSnapshot" = '';

-- ============================================================
-- TABELA events: campos snapshot + tipo
-- ============================================================
ALTER TABLE "events"
  ADD COLUMN IF NOT EXISTS "employeeSnapshot" TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "cargoSnapshot"    TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "funcaoSnapshot"   TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "tipo" "FeedbackTipo" NOT NULL DEFAULT 'POSITIVE';

-- Preencher snapshots dos registros existentes
UPDATE "events" ev
SET
  "employeeSnapshot" = COALESCE(e.name,  ''),
  "cargoSnapshot"    = COALESCE(e.cargo, ''),
  "funcaoSnapshot"   = COALESCE(e.funcao,'')
FROM "employees" e
WHERE ev."employeeId" = e.id
  AND ev."employeeSnapshot" = '';

-- ============================================================
-- TABELA city_backgrounds: imageUrl vira TEXT (para base64 data URLs)
-- ============================================================
ALTER TABLE "city_backgrounds"
  ALTER COLUMN "imageUrl" TYPE TEXT;

-- ============================================================
-- TABELA global_backgrounds: imageUrl vira TEXT (para base64 data URLs)
-- ============================================================
ALTER TABLE "global_backgrounds"
  ALTER COLUMN "imageUrl" TYPE TEXT;
