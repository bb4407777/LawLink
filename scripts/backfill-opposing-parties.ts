/**
 * v0.46: 从 Party 表提取对方当事人去重入库
 *
 * 用法: npx tsx scripts/backfill-opposing-parties.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 1. 查所有未关联的 OPPOSING_PARTY
  const parties = await prisma.party.findMany({
    where: { role: "OPPOSING_PARTY", opposingPartyId: null },
    orderBy: { updatedAt: "desc" }
  });

  if (parties.length === 0) {
    console.log("没有需要迁移的对方当事人记录");
    return;
  }

  console.log(`找到 ${parties.length} 条待迁移的对方当事人记录`);

  // 2. 按 (name, normalized idNumber) 分组
  const groups = new Map<string, typeof parties>();
  for (const p of parties) {
    const key = `${p.name.trim()}|${(p.idNumber || "").trim()}`;
    const arr = groups.get(key) || [];
    arr.push(p);
    groups.set(key, arr);
  }

  console.log(`去重后 ${groups.size} 个唯一对方当事人`);

  // 3. 逐个创建 OpposingParty + 更新关联
  const year = new Date().getFullYear();
  let counter = 0;
  let created = 0;
  let updated = 0;

  for (const [key, group] of groups) {
    // 取最完整的记录（优先有 idNumber 的）
    const best = group.reduce((a, b) => {
      const aScore = (a.idNumber ? 2 : 0) + (a.phone ? 1 : 0) + (a.address ? 1 : 0);
      const bScore = (b.idNumber ? 2 : 0) + (b.phone ? 1 : 0) + (b.address ? 1 : 0);
      return bScore > aScore ? b : a;
    });

    counter++;
    const internalCode = `DF-${year}-${String(counter).padStart(4, "0")}`;

    // 创建 OpposingParty
    const op = await prisma.opposingParty.create({
      data: {
        name: best.name.trim(),
        partyType: best.partyType,
        idNumber: best.idNumber || null,
        phone: best.phone || null,
        address: best.address || null,
        legalRep: best.legalRep || null,
        notes: best.notes || null,
        tags: [],
        internalCode
      }
    });

    created++;

    // 更新所有关联的 Party 记录
    const ids = group.map((p) => p.id);
    await prisma.party.updateMany({
      where: { id: { in: ids } },
      data: { opposingPartyId: op.id }
    });
    updated += ids.length;
  }

  console.log(`完成: 创建 ${created} 条对方当事人, 关联更新 ${updated} 条 Party 记录`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
