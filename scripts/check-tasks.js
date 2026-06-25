const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const tasks = await prisma.task.findMany({
    orderBy: [{ completed: "asc" }, { createdAt: "desc" }],
    where: { completed: false },
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
    }
  });
  console.log(JSON.stringify(tasks, null, 2));
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
