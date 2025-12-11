import { PrismaClient } from '@prisma/client';
import { locationProvince } from './data/location_province';

export async function seedProvinces(prisma: PrismaClient) {
  console.log('Seeding provinces...');
  
  for (const province of locationProvince) {
    await prisma.location.upsert({
      where: { id: province.id },
      update: {
        name: province.name,
        locationLevelId: province.locationLevelId,
        locationId: province.parentLocation?.id || null,
        createdAt: new Date(province.createdAt),
        updatedAt: new Date(province.updatedAt),
      },
      create: {
        id: province.id,
        name: province.name,
        locationLevelId: province.locationLevelId,
        locationId: province.parentLocation?.id || null,
        createdAt: new Date(province.createdAt),
        updatedAt: new Date(province.updatedAt),
      }
    });
  }
  
  console.log(`Seeded ${locationProvince.length} provinces`);
}