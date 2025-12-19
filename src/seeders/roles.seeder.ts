import { PrismaClient } from '@prisma/client';

export async function seedRoles(prisma: PrismaClient) {
  console.log('Seeding roles...');

  const roles = [
    'UMUFASHAMYUMVIRE',
    'AGRONOMIST',
    'VETERINARIAN',
    'FARMER',
    'ADMIN',
    'BUTCHER',
    'BUYER',
    'DEV_ADMIN',
    'COLLECTIVE_COOPERATIVE_MANAGER',
    'NON_COLLECTIVE_COOPERATIVE_MANAGER',
  ];

  for (const name of roles) {
    await prisma.role.upsert({
      where: { name },
      create: { name },
      update: {},
    });
  }

  console.log(`Seeded ${roles.length} roles`);
}

