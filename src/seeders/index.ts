import { PrismaClient } from '@prisma/client';
import { seedRoles } from './roles.seeder';
import { seedLocationLevels } from './location_level.seeder';
import { seedProvinces } from './provinces.seeder';
import { seedDistricts } from './districts.seeder';
import { seedSectors } from './sectors.seeder';
import { seedDevUsers } from './dev-users.seeder';
import { seedMetrics } from './metrics.seeder';
import { seedHarvestSeasons } from './harvest-seasons.seeder';
import { seedCrops } from './crops.seeder';
import { seedAnimals } from './animals.seeder';
import { seedFertilisers } from './fertilisers.seeder';
import { seedMedicines } from './medicines.seeder';
import { seedVaccines } from './vaccines.seeder';
import { seedComprehensiveData } from './comprehensive-data.seeder';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seeding...\n');

  // Seed in order of dependencies
  await seedRoles(prisma);
  await seedLocationLevels(prisma);
  await seedProvinces(prisma);
  await seedDistricts(prisma);
  await seedSectors(prisma);

  // Dev login accounts (safe to re-run)
  await seedDevUsers(prisma);

  // Master/reference data (safe to re-run)
  await seedMetrics(prisma);
  await seedHarvestSeasons(prisma);
  await seedCrops(prisma);
  await seedAnimals(prisma);
  await seedFertilisers(prisma);
  await seedMedicines(prisma);
  await seedVaccines(prisma);

  // Comprehensive demo data (farmers, seasons, orders, etc.)
  await seedComprehensiveData(prisma);

  console.log('\nAll seeders completed successfully!');
}

main()
  .catch((error) => {
    console.error('Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
