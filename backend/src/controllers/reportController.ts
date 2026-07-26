import { Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

export const getReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const cityId = req.cityId!;
    const { employeeId, cargo, month, year } = req.query as Record<string, string>;

    // ── Janela de datas ──────────────────────────────────────────────────────
    let dateFilter: { gte: Date; lt: Date } | undefined;
    if (month || year) {
      const now = new Date();
      const y = year  ? parseInt(year)  : now.getFullYear();
      const m = month ? parseInt(month) : null;
      if (m !== null) {
        dateFilter = { gte: new Date(y, m - 1, 1), lt: new Date(y, m, 1) };
      } else {
        dateFilter = { gte: new Date(y, 0, 1), lt: new Date(y + 1, 0, 1) };
      }
    }

    // ── Filtros de funcionário ──────────────────────────────────────────────
    const employeeWhere: Record<string, unknown> = { cityId };
    if (employeeId) employeeWhere.id   = employeeId;
    if (cargo)      employeeWhere.cargo = { contains: cargo, mode: 'insensitive' };

    const employees = await prisma.employee.findMany({
      where: employeeWhere,
      select: { id: true, name: true, cargo: true, funcao: true },
      orderBy: { name: 'asc' }
    });

    // ── Stats por funcionário ────────────────────────────────────────────────
    const employeeStats = await Promise.all(
      employees.map(async (emp) => {
        const eWhere: Record<string, unknown> = { cityId, employeeId: emp.id };
        const tWhere: Record<string, unknown> = { cityId, employeeId: emp.id };
        if (dateFilter) { eWhere.createdAt = dateFilter; tWhere.createdAt = dateFilter; }
        const now = new Date();

        const [pos, neg, done, cancelled, pending, inProg, overdue] = await Promise.all([
          prisma.event.count({ where: { ...eWhere, tipo: 'POSITIVE' } }),
          prisma.event.count({ where: { ...eWhere, tipo: 'NEGATIVE' } }),
          prisma.task.count({  where: { ...tWhere, status: 'COMPLETED' } }),
          prisma.task.count({  where: { ...tWhere, status: 'CANCELLED' } }),
          prisma.task.count({  where: { ...tWhere, status: 'PENDING' } }),
          prisma.task.count({  where: { ...tWhere, status: 'IN_PROGRESS' } }),
          prisma.task.count({  where: { ...tWhere, status: { in: ['PENDING', 'IN_PROGRESS'] }, dueDate: { lt: now } } }),
        ]);

        // on-time vs late via rawQuery — comparação entre dois campos DateTime
        const rows = await prisma.$queryRaw<{ ontime: bigint; late: bigint }[]>(
          dateFilter
            ? Prisma.sql`
                SELECT
                  COUNT(*) FILTER (WHERE "completedAt" <= "dueDate") AS ontime,
                  COUNT(*) FILTER (WHERE "completedAt" >  "dueDate") AS late
                FROM tasks
                WHERE "cityId" = ${cityId}
                  AND "employeeId" = ${emp.id}
                  AND status = 'COMPLETED'
                  AND "completedAt" IS NOT NULL
                  AND "createdAt" >= ${dateFilter.gte}
                  AND "createdAt" <  ${dateFilter.lt}`
            : Prisma.sql`
                SELECT
                  COUNT(*) FILTER (WHERE "completedAt" <= "dueDate") AS ontime,
                  COUNT(*) FILTER (WHERE "completedAt" >  "dueDate") AS late
                FROM tasks
                WHERE "cityId" = ${cityId}
                  AND "employeeId" = ${emp.id}
                  AND status = 'COMPLETED'
                  AND "completedAt" IS NOT NULL`
        );
        const onTime = Number(rows[0]?.ontime ?? 0);
        const late   = Number(rows[0]?.late   ?? 0);

        const totalF = pos + neg;
        const totalT = done + cancelled + pending + inProg;
        return {
          employee: emp,
          feedbacks: {
            total: totalF, positive: pos, negative: neg,
            positiveRate: totalF > 0 ? Math.round((pos / totalF) * 100) : null
          },
          tasks: {
            total: totalT, completed: done, cancelled, pending, inProgress: inProg,
            overdue, onTime, late,
            onTimeRate: done > 0 ? Math.round((onTime / done) * 100) : null
          }
        };
      })
    );

    // ── Resumo global ─────────────────────────────────────────────────────────
    const cEW: Record<string, unknown> = { cityId };
    const cTW: Record<string, unknown> = { cityId };
    if (dateFilter)  { cEW.createdAt = dateFilter; cTW.createdAt = dateFilter; }
    if (employeeId)  { cEW.employeeId = employeeId; cTW.employeeId = employeeId; }
    if (cargo) {
      cEW.cargo = { contains: cargo, mode: 'insensitive' };
      cTW.employeeId = { in: employees.map(e => e.id) };
    }

    const [sPos, sNeg, sDone, sCancelled, sPending, sInProg] = await Promise.all([
      prisma.event.count({ where: { ...cEW, tipo: 'POSITIVE' } }),
      prisma.event.count({ where: { ...cEW, tipo: 'NEGATIVE' } }),
      prisma.task.count({  where: { ...cTW, status: 'COMPLETED' } }),
      prisma.task.count({  where: { ...cTW, status: 'CANCELLED' } }),
      prisma.task.count({  where: { ...cTW, status: 'PENDING' } }),
      prisma.task.count({  where: { ...cTW, status: 'IN_PROGRESS' } }),
    ]);

    const cityRows = await prisma.$queryRaw<{ ontime: bigint; late: bigint }[]>(
      Prisma.sql`
        SELECT
          COUNT(*) FILTER (WHERE "completedAt" <= "dueDate") AS ontime,
          COUNT(*) FILTER (WHERE "completedAt" >  "dueDate") AS late
        FROM tasks
        WHERE "cityId" = ${cityId}
          AND status = 'COMPLETED'
          AND "completedAt" IS NOT NULL`
    );
    const cOnTime = Number(cityRows[0]?.ontime ?? 0);
    const cLate   = Number(cityRows[0]?.late   ?? 0);
    const totalF  = sPos + sNeg;
    const totalT  = sDone + sCancelled + sPending + sInProg;

    res.json({
      success: true,
      data: {
        summary: {
          feedbacks: {
            total: totalF, positive: sPos, negative: sNeg,
            positiveRate: totalF > 0 ? Math.round((sPos / totalF) * 100) : null
          },
          tasks: {
            total: totalT, completed: sDone, cancelled: sCancelled,
            pending: sPending, inProgress: sInProg,
            onTime: cOnTime, late: cLate,
            onTimeRate: sDone > 0 ? Math.round((cOnTime / sDone) * 100) : null
          }
        },
        employees: employeeStats
      }
    });
  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ success: false, error: 'Erro ao gerar relatório' });
  }
};
