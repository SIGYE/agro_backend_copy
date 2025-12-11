import { PrismaClient } from '@prisma/client';
import { locationSector } from './data/location_sector';

export async function seedSectors(prisma: PrismaClient) {
  console.log(' Seeding sectors...');
  
  for (const sector of locationSector) {
    // Clean sector name (remove trailing spaces)
    const cleanName = sector.name.trim();
    
    await prisma.location.upsert({
      where: { id: sector.id },
      update: {
        name: cleanName,
        locationLevelId: sector.locationLevelId,
        locationId: sector.parentLocation?.id || null,
        createdAt: new Date(sector.createdAt),
        updatedAt: new Date(sector.updatedAt),
      },
      create: {
        id: sector.id,
        name: cleanName,
        locationLevelId: sector.locationLevelId,
        locationId: sector.parentLocation?.id || null,
        createdAt: new Date(sector.createdAt),
        updatedAt: new Date(sector.updatedAt),
      }
    });
  }
  
  console.log(`Seeded ${locationSector.length} sectors`);
}