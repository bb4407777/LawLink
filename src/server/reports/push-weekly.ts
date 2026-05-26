"use server";

/**
 * v0.21: admin 手动推送本周报告给全员（不依赖 cron）
 *
 * 收件人：所有 active 的 ADMIN / PRINCIPAL_LAWYER / LAWYER。
 * 内容：每个律师收到自己的 LawyerWeeklyDigest 摘要，作为 Notification（type=SYSTEM）。
 */
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { createNotification } from "@/server/notifications/create";
import {
  weekPeriod,
  getLawyerWeeklyDigest,
  formatWeeklyDigestContent
} from "./weekly";

export async function pushWeeklyReportToAll(): Promise<{
  succeeded: number;
  failed: { userId: string; error: string }[];
  weekLabel: string;
}> {
  const session = await requireSession();
  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("仅管理员 / 主任律师可推送周报");
  }

  const period = weekPeriod();
  const recipients = await prisma.user.findMany({
    where: {
      active: true,
      role: { in: ["ADMIN", "PRINCIPAL_LAWYER", "LAWYER"] }
    },
    select: { id: true, name: true }
  });

  const failed: { userId: string; error: string }[] = [];
  let succeeded = 0;
  for (const u of recipients) {
    try {
      const digest = await getLawyerWeeklyDigest({
        userId: u.id,
        userName: u.name,
        period
      });
      await createNotification({
        userId: u.id,
        type: "SYSTEM",
        priority: "NORMAL",
        title: `本周报告（${period.label}）`,
        content: formatWeeklyDigestContent(digest),
        href: "/reports?period=month",
        refType: "WeeklyReport",
        refId: period.label
      });
      succeeded++;
    } catch (err) {
      failed.push({
        userId: u.id,
        error: err instanceof Error ? err.message : "未知错误"
      });
    }
  }

  await audit({
    userId: session.user.id,
    action: "WEEKLY_REPORT_PUSH",
    targetType: "Report",
    targetId: period.label,
    detail: {
      weekLabel: period.label,
      total: recipients.length,
      succeeded,
      failed: failed.length
    }
  });

  return { succeeded, failed, weekLabel: period.label };
}
