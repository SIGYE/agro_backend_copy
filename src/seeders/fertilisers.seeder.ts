import { PrismaClient } from '@prisma/client';

const DEFAULT_FERTILISERS = ['NPK', 'Urea', 'DAP'];

async function getSeederUserId(prisma: PrismaClient): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: 'devadmin@mail.com' },
    select: { id: true },
  });
  if (!user) throw new Error('Seeder requires devadmin user; run seedDevUsers first');
  return user.id;
}

export async function seedFertilisers(prisma: PrismaClient) {
  console.log('Seeding fertilisers...');

  const createdBy = await getSeederUserId(prisma);

  for (const name of DEFAULT_FERTILISERS) {
    const exists = await prisma.feterlizer.findFirst({
      where: { name },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.feterlizer.create({
      data: {
        name,
        createdBy,
      },
    });
  }

  const total = await prisma.feterlizer.count();
  console.log(`Seeded fertilisers (total: ${total})`);
}

