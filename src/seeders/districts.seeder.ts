import { PrismaClient } from '@prisma/client';
import { locationDistrict } from './data/location_district';

export async function seedDistricts(prisma: PrismaClient) {
  console.log('Seeding districts...');
  
  for (const district of locationDistrict) {
    await prisma.location.upsert({
      where: { id: district.id },
      update: {
        name: district.name,
        locationLevelId: district.locationLevelId,
        locationId: district.parentLocation?.id || null,
        createdAt: new Date(district.createdAt),
        updatedAt: new Date(district.updatedAt),
      },
      create: {
        id: district.id,
        name: district.name,
        locationLevelId: district.locationLevelId,
        locationId: district.parentLocation?.id || null,
        createdAt: new Date(district.createdAt),
        updatedAt: new Date(district.updatedAt),
      }
    });
  }
  
  console.log(`Seeded ${locationDistrict.length} districts`);
}