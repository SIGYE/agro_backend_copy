import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

type CropSeedStrain = { name: string };
type CropSeedType = { name: string; seedStrains?: CropSeedStrain[] };
type CropSeed = { name: string; cropTypes?: CropSeedType[] };
type CropSeedFile = { crops?: CropSeed[] };

async function getSeederUser(prisma: PrismaClient) {
  const user = await prisma.user.findUnique({
    where: { email: 'devadmin@mail.com' },
    select: { id: true, country: true },
  });
  if (!user) {
    throw new Error('Seeder requires devadmin user; run seedDevUsers first');
  }
  return user;
}

export async function seedCrops(prisma: PrismaClient) {
  console.log('Seeding crops (master data)...');

  const filePath = path.resolve(__dirname, '..', '..', 'crops_data.json');
  if (!fs.existsSync(filePath)) {
    console.log('crops_data.json not found, skipping crop seed.');
    return;
  }

  const parsed: CropSeedFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const crops = parsed.crops ?? [];

  const seederUser = await getSeederUser(prisma);

  for (const cropSeed of crops) {
    if (!cropSeed?.name) continue;

    let crop = await prisma.crop.findFirst({
      where: {
        country: seederUser.country ?? 1,
        cooperativeId: null,
        OR: [
          { name: cropSeed.name },
          {
            names: {
              some: {
                name: cropSeed.name,
                languageCode: 'en',
              },
            },
          },
        ],
      },
      include: { names: true },
    });

    if (!crop) {
      crop = await prisma.crop.create({
        data: {
          name: cropSeed.name,
          createdBy: seederUser.id,
          country: seederUser.country ?? 1,
          cooperativeId: null,
          names: {
            create: [
              {
                name: cropSeed.name,
                languageCode: 'en',
                languageName: 'English',
              },
            ],
          },
        },
        include: { names: true },
      });
    } else {
      const hasEn = crop.names?.some((n) => n.languageCode === 'en');
      if (!hasEn) {
        await prisma.cropNames.create({
          data: {
            cropId: crop.id,
            name: cropSeed.name,
            languageCode: 'en',
            languageName: 'English',
          },
        });
      }

      if (!crop.name) {
        await prisma.crop.update({
          where: { id: crop.id },
          data: { name: cropSeed.name },
        });
      }
    }

    const cropTypes = cropSeed.cropTypes ?? [];
    for (const cropTypeSeed of cropTypes) {
      if (!cropTypeSeed?.name) continue;

      const cropType = await prisma.cropType.upsert({
        where: { name: cropTypeSeed.name },
        create: { name: cropTypeSeed.name, cropId: crop.id },
        update: { cropId: crop.id },
      });

      const strains = cropTypeSeed.seedStrains ?? [];
      for (const strainSeed of strains) {
        if (!strainSeed?.name) continue;
        const existing = await prisma.seedStrain.findFirst({
          where: { cropTypeId: cropType.id, name: strainSeed.name },
          select: { id: true },
        });
        if (existing) continue;
        await prisma.seedStrain.create({
          data: { cropTypeId: cropType.id, name: strainSeed.name },
        });
      }
    }
  }

  const total = await prisma.crop.count({ where: { cooperativeId: null } });
  console.log(`Seeded crops (total global crops: ${total})`);
}

