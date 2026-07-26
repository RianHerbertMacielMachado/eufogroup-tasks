-- Migration: employee_set_null_on_delete
-- Corrige comportamento ao deletar funcionário:
-- - employeeId vira nullable em tasks e events
-- - FK passa de CASCADE para SET NULL
-- Assim, ao deletar um funcionário, tasks e events são MANTIDOS (employeeId fica NULL)

-- ============================================================
-- TABELA tasks
-- ============================================================

-- 1. Remover constraint CASCADE criada na migration anterior
ALTER TABLE "tasks" DROP CONSTRAINT IF EXISTS "tasks_employeeId_fkey";

-- 2. Tornar employeeId nullable
ALTER TABLE "tasks" ALTER COLUMN "employeeId" DROP NOT NULL;

-- 3. Recriar FK com SET NULL
ALTER TABLE "tasks"
  ADD CONSTRAINT "tasks_employeeId_fkey"
  FOREIGN KEY ("employeeId")
  REFERENCES "employees"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- ============================================================
-- TABELA events
-- ============================================================

-- 1. Remover constraint CASCADE criada na migration anterior
ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "events_employeeId_fkey";

-- 2. Tornar employeeId nullable
ALTER TABLE "events" ALTER COLUMN "employeeId" DROP NOT NULL;

-- 3. Recriar FK com SET NULL
ALTER TABLE "events"
  ADD CONSTRAINT "events_employeeId_fkey"
  FOREIGN KEY ("employeeId")
  REFERENCES "employees"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;
