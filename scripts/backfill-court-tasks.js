/**
 * 法院短信待办任务回填/检查脚本
 *
 * 用途：
 *   1. 为已有的 COURT Note 补建"下载文书"和"送达当事人"任务
 *   2. 定期检查 COURT Note 是否有对应的任务
 *
 * 用法：
 *   node scripts/backfill-court-tasks.js                  # 执行回填（默认2025年起）
 *   node scripts/backfill-court-tasks.js --all            # 全部历史记录
 *   node scripts/backfill-court-tasks.js --check          # 仅检查不创建
 *   node scripts/backfill-court-tasks.js --dry-run        # 试运行
 *
 * 逻辑：按 (matterId, courtName) 去重，同一案件同一法院只建一组任务。
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const CHECK_ONLY = args.includes("--check");
const SINCE = args.includes("--all") ? null : new Date("2026-06-01"); // 默认仅 2026年6月起

async function main() {
  // 默认指派人
  const assignee = await prisma.user.findFirst({
    where: { role: "ADMIN" },
    orderBy: { createdAt: "asc" },
    select: { id: true, name: true }
  });
  if (!assignee) { console.error("❌ 未找到 ADMIN 用户"); process.exit(1); }
  console.log(`👤 默认指派人：${assignee.name}\n`);

  // 1. 获取 COURT Note（去重取 matterId + withWhom）
  const whereClause = { channel: "COURT", matterId: { not: null }, deletedAt: null };
  if (SINCE) whereClause.occurredAt = { gte: SINCE };

  const notes = await prisma.note.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    include: {
      matter: { select: { id: true, internalCode: true, title: true } }
    }
  });
  console.log(`📋 共 ${notes.length} 条 COURT Note`);

  // 按 (matterId, courtName) 去重，保留最新那条的信息
  const pairMap = new Map();
  for (const note of notes) {
    const courtName = note.withWhom || "法院";
    const key = `${note.matterId}::${courtName}`;
    if (!pairMap.has(key)) pairMap.set(key, note);
  }
  const pairs = [...pairMap.values()];
  console.log(`🔑 去重后 ${pairs.length} 个 (案件×法院) 组合\n`);

  // 2. 获取已有未完成任务
  const existingTasks = await prisma.task.findMany({
    where: {
      matterId: { not: null },
      completed: false,
      OR: [
        { title: { startsWith: "📄 下载文书" } },
        { title: { startsWith: "📬 送达当事人" } }
      ]
    },
    select: { matterId: true, title: true }
  });
  const existingSet = new Set(existingTasks.map(t => `${t.matterId}::${t.title}`));

  // 3. 创建任务
  let created = 0, skipped = 0;
  for (const note of pairs) {
    const matterId = note.matterId;
    const courtName = note.withWhom || "法院";
    const label = note.matter
      ? `${note.matter.internalCode || "?"} ${(note.matter.title || "").slice(0, 30)}`
      : matterId;

    const defs = [
      { title: `📄 下载文书 - ${courtName}` },
      { title: `📬 送达当事人 - ${courtName}` }
    ];

    for (const def of defs) {
      const key = `${matterId}::${def.title}`;
      if (existingSet.has(key)) { skipped++; continue; }
      existingSet.add(key); // 防本批重复

      if (!DRY_RUN && !CHECK_ONLY) {
        const dateStr = note.occurredAt.toLocaleDateString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit" });
        const descWithDate = `📅 ${dateStr}\n${note.content}`;
        const task = await prisma.task.create({
          data: {
            matterId,
            title: def.title,
            description: descWithDate.slice(0, 2000),
            priority: 2,
            assigneeId: assignee.id
          }
        });
        await prisma.timelineEvent.create({
          data: {
            matterId,
            eventType: "TASK_ADDED",
            title: `新增事项：${def.title}`,
            occurredAt: new Date(),
            refType: "Task",
            refId: task.id
          }
        });
      }
      console.log(`  ${def.title.slice(0, 2)} [${label}] ${def.title}`);
      created++;
    }
  }

  console.log(`\n✅ 完成`);
  console.log(`   ${DRY_RUN ? "将创建" : CHECK_ONLY ? "需创建" : "已创建"} ${created} 个任务`);
  console.log(`   跳过 ${skipped} 个已有任务`);

  await prisma.$disconnect();
}

main().catch(e => {
  console.error("❌ 失败:", e);
  prisma.$disconnect();
  process.exit(1);
});
