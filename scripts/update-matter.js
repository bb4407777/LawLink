const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const matterId = 'cmqgoxzsb06q4gmra07khxb4q';
  const me = 'cmqdee28m0000459oe03nizby';

  const note = await prisma.note.create({
    data: {
      content: '二审调解结案：海目星（江门）激光智能装备有限公司一次性支付黄高宇 35,000元（含全部款项），2026年6月18日前付至黄高宇中信银行账户（6217680914069195）。收到（2026）粤07民终1521、1522号民事调解书。',
      channel: 'OTHER',
      matter: { connect: { id: matterId } },
      author: { connect: { id: me } },
      createdAt: new Date(),
    }
  });
  console.log('✅ Note 已添加:', note.id);

  await prisma.$disconnect();
  console.log('全部完成！');
}
main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
