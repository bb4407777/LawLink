/**
 * v0.27: 任务/期限到期提醒扫描
 *
 * 每天 09:00 跑一次（Asia/Shanghai），覆盖 Task 表和 Deadline 表：
 * - 命中 dueAt 落在 T-3 / T-1 / T / T+1 的未完成项各发一条通知
 * - 接收人：Task → assigneeId || matter.ownerId；Deadline → procedure.matter.ownerId
 * - 去重：refType="DueReminder:Task:-3" 等 + refId 实体 ID + 当日已发不再发
 *
 * 业务原因：v0.26 之前没有"扫到期发提醒"任务，导致律师设的答辩期、举证期等到点不响。
 */
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/server/notifications/create";
import { audit } from "@/server/audit";
import { requireSession } from "@/lib/auth/session";

const OFFSETS = [-3, -1, 0, 1] as const;
type Offset = (typeof OFFSETS)[number];

export type DueReminderScanResult = {
  taskScanned: number;
  taskNotified: number;
  deadlineScanned: number;
  deadlineNotified: number;
  suppressed: number;
};

function startOfLocalDay(d: Date) {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfLocalDay(d: Date) {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function offsetKey(offset: Offset) {
  return `DueReminder:${offset >= 0 ? "+" : ""}${offset}`;
}

function priorityFor(offset: Offset) {
  if (offset >= 1) return "URGENT";
  if (offset === 0) return "HIGH";
  if (offset === -1) return "HIGH";
  return "NORMAL";
}

function stateText(offset: Offset) {
  if (offset > 0) return `逾期 ${offset} 天`;
  if (offset === 0) return "今天到期";
  return `还有 ${-offset} 天到期`;
}

export async function scanDueReminders(): Promise<DueReminderScanResult> {
  const now = new Date();
  const todayStart = startOfLocalDay(now);

  let taskScanned = 0;
  let taskNotified = 0;
  let deadlineScanned = 0;
  let deadlineNotified = 0;
  let suppressed = 0;

  for (const offset of OFFSETS) {
    const target = new Date(now);
    target.setDate(target.getDate() + offset);
    const dayStart = startOfLocalDay(target);
    const dayEnd = endOfLocalDay(target);

    // Task 扫描
    const tasks = await prisma.task.findMany({
      where: {
        completed: false,
        dueAt: { gte: dayStart, lte: dayEnd }
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        assigneeId: true,
        matter: {
          select: { id: true, title: true, internalCode: true, ownerId: true }
        }
      }
    });
    taskScanned += tasks.length;

    const refTypeTask = `${offsetKey(offset)}:Task`;
    for (const t of tasks) {
      const userId = t.assigneeId ?? t.matter.ownerId;
      if (!userId) continue;

      const dup = await prisma.notification.findFirst({
        where: { refType: refTypeTask, refId: t.id, createdAt: { gte: todayStart } },
        select: { id: true }
      });
      if (dup) {
        suppressed++;
        continue;
      }

      await createNotification({
        userId,
        type: "DEADLINE_REMINDER",
        priority: priorityFor(offset),
        title: `${stateText(offset)}：${t.title}`,
        content: `案件 ${t.matter.internalCode}·${t.matter.title}`,
        href: `/matters/${t.matter.id}`,
        refType: refTypeTask,
        refId: t.id
      });
      taskNotified++;
    }

    // Deadline 扫描（程序内法定期限：答辩期、举证期等）
    const deadlines = await prisma.deadline.findMany({
      where: {
        completed: false,
        dueAt: { gte: dayStart, lte: dayEnd }
      },
      select: {
        id: true,
        title: true,
        dueAt: true,
        procedure: {
          select: {
            id: true,
            matter: {
              select: { id: true, title: true, internalCode: true, ownerId: true }
            }
          }
        }
      }
    });
    deadlineScanned += deadlines.length;

    const refTypeDL = `${offsetKey(offset)}:Deadline`;
    for (const d of deadlines) {
      const userId = d.procedure.matter.ownerId;
      if (!userId) continue;

      const dup = await prisma.notification.findFirst({
        where: { refType: refTypeDL, refId: d.id, createdAt: { gte: todayStart } },
        select: { id: true }
      });
      if (dup) {
        suppressed++;
        continue;
      }

      await createNotification({
        userId,
        type: "DEADLINE_REMINDER",
        priority: priorityFor(offset),
        title: `${stateText(offset)}：${d.title}`,
        content: `案件 ${d.procedure.matter.internalCode}·${d.procedure.matter.title}`,
        href: `/matters/${d.procedure.matter.id}`,
        refType: refTypeDL,
        refId: d.id
      });
      deadlineNotified++;
    }
  }

  await audit({
    userId: null,
    action: "DUE_REMINDER_SCAN_CRON",
    targetType: "Report",
    targetId: "due-reminder",
    detail: {
      taskScanned,
      taskNotified,
      deadlineScanned,
      deadlineNotified,
      suppressed,
      offsets: OFFSETS
    }
  });

  return { taskScanned, taskNotified, deadlineScanned, deadlineNotified, suppressed };
}

/**
 * 手动触发入口：admin / 主任律师可立即扫一遍（用于灰度验证 + 紧急补推）
 */
export async function triggerDueReminderScan(): Promise<DueReminderScanResult> {
  "use server";
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("仅管理员 / 主任律师可手动触发到期提醒扫描");
  }
  return scanDueReminders();
}

