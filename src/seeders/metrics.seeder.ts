import { PrismaClient } from '@prisma/client';

type MetricSeed = {
  name: string;
  unit: string;
};

const METRICS: MetricSeed[] = [
  { name: 'Kilogram', unit: 'KG' },
  { name: 'Hectare', unit: 'HA' },
  { name: 'Liter', unit: 'L' },
];

export async function seedMetrics(prisma: PrismaClient) {
  console.log('Seeding metrics...');

  for (const metric of METRICS) {
    const exists = await prisma.metric.findFirst({
      where: { name: metric.name, unit: metric.unit },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.metric.create({
      data: {
        name: metric.name,
        unit: metric.unit,
      },
    });
  }

  const total = await prisma.metric.count();
  console.log(`Seeded metrics (total: ${total})`);
}

