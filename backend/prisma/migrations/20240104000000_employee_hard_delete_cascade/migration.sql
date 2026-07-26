-- Migration: employee_hard_delete_cascade
-- Altera as FK constraints de tasks e events para ON DELETE CASCADE
-- Isso permite deletar um funcionário mesmo que ele tenha tasks/events vinculados
-- As tasks e events serão deletadas automaticamente em cascata

-- ============================================================
-- TABELA tasks: alterar FK employeeId para ON DELETE CASCADE
-- ============================================================

-- 1. Remover constraint existente (sem onDelete = RESTRICT por padrão)
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_employeeId_fkey";

-- 2. Recriar com ON DELETE CASCADE
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_employeeId_fkey"
  FOREIGN KEY ("employeeId")
  REFERENCES "employees"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- ============================================================
-- TABELA events: alterar FK employeeId para ON DELETE CASCADE
-- ============================================================

-- 1. Remover constraint existente
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_employeeId_fkey";

-- 2. Recriar com ON DELETE CASCADE
ALTER TABLE "events"
  ADD CONSTRAINT "events_employeeId_fkey"
  FOREIGN KEY ("employeeId")
  REFERENCES "employees"("id")
  ON DELETE CASCADE
  ON UPDATE CASCADE;
