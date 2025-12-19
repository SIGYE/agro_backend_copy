import { PrismaClient } from '@prisma/client';

const DEFAULT_VACCINES = ['FMD Vaccine', 'Rabies Vaccine'];

export async function seedVaccines(prisma: PrismaClient) {
  console.log('Seeding vaccines...');

  for (const name of DEFAULT_VACCINES) {
    const exists = await prisma.vaccine.findFirst({
      where: { name },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.vaccine.create({ data: { name } });
  }

  const total = await prisma.vaccine.count();
  console.log(`Seeded vaccines (total: ${total})`);
}

