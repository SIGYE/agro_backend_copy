import { PrismaClient } from '@prisma/client';
import { seedLocationLevels } from './location_level.seeder';
import { seedProvinces } from './provinces.seeder';
import { seedDistricts } from './districts.seeder';
import { seedSectors } from './sectors.seeder';


const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...\n');
  
  // Seed in order of dependencies
  await seedLocationLevels(prisma);
  await seedProvinces(prisma);
  await seedDistricts(prisma);
  await seedSectors(prisma);
  
  console.log('\n🎉 All seeders completed successfully!');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });