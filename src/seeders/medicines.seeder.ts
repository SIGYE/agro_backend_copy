import { PrismaClient } from '@prisma/client';

const DEFAULT_MEDICINES = ['Albendazole', 'Oxytetracycline', 'Ivermectin'];

export async function seedMedicines(prisma: PrismaClient) {
  console.log('Seeding medicines...');

  for (const name of DEFAULT_MEDICINES) {
    const exists = await prisma.medicine.findFirst({
      where: { name },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.medicine.create({ data: { name } });
  }

  const total = await prisma.medicine.count();
  console.log(`Seeded medicines (total: ${total})`);
}

