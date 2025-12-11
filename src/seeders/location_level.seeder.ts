import { PrismaClient } from '@prisma/client';
import { locationLevels } from './data/location_level';

export async function seedLocationLevels(prisma: PrismaClient) {
  console.log('Seeding location levels...');
  
  for (const level of locationLevels) {
    await prisma.locationLevel.upsert({
      where: { id: level.id },
      update: {
        order_number: level.order_number,
        name: level.name,
        code: level.code,
        createdAt: new Date(level.createdAt),
        updatedAt: new Date(level.updatedAt),
      },
      create: {
        id: level.id,
        order_number: level.order_number,
        name: level.name,
        code: level.code,
        createdAt: new Date(level.createdAt),
        updatedAt: new Date(level.updatedAt),
      }
    });
  }
  
  console.log(` Seeded ${locationLevels.length} location levels`);
}