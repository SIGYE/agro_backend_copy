import { DiseaseType, PestType, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

type AnimalBreedSeed = { breedName: string };
type AnimalProductSeed = { name: string };
type AnimalMedicineSeed = { name: string };
type AnimalVaccineSeed = { name: string };
type AnimalDiseaseSeed = { name: string; type?: string; medication?: string };
type AnimalPestSeed = { name: string; type?: string; medication?: string };

type AnimalSeed = {
  name: string;
  breeds?: AnimalBreedSeed[];
  animalProducts?: AnimalProductSeed[];
  vaccines?: AnimalVaccineSeed[];
  medicines?: AnimalMedicineSeed[];
  diseases?: AnimalDiseaseSeed[];
  pests?: AnimalPestSeed[];
};

type AnimalSeedFile = { animals?: AnimalSeed[] };

async function getSeederUserId(prisma: PrismaClient): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email: 'devadmin@mail.com' },
    select: { id: true },
  });
  if (!user) throw new Error('Seeder requires devadmin user; run seedDevUsers first');
  return user.id;
}

function mapDiseaseType(input?: string): DiseaseType {
  if (String(input).toUpperCase() === 'CROP') return DiseaseType.CROP;
  return DiseaseType.LIVESTOCK;
}

function mapPestType(input?: string): PestType {
  if (String(input).toUpperCase() === 'CROP') return PestType.CROP;
  return PestType.LIVESTOCK;
}

export async function seedAnimals(prisma: PrismaClient) {
  console.log('Seeding animals (master data)...');

  const filePath = path.resolve(__dirname, '..', '..', 'animals_data.json');
  if (!fs.existsSync(filePath)) {
    console.log('animals_data.json not found, skipping animal seed.');
    return;
  }

  const parsed: AnimalSeedFile = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const animals = parsed.animals ?? [];
  const createdBy = await getSeederUserId(prisma);

  for (const animalSeed of animals) {
    if (!animalSeed?.name) continue;

    let animal = await prisma.animal.findFirst({
      where: {
        OR: [
          { name: animalSeed.name },
          {
            animalNames: {
              some: { name: animalSeed.name, languageCode: 'en' },
            },
          },
        ],
      },
      include: { animalNames: true },
    });

    if (!animal) {
      animal = await prisma.animal.create({
        data: {
          name: animalSeed.name,
          createdBy,
          animalNames: {
            create: [
              {
                name: animalSeed.name,
                languageCode: 'en',
                languageName: 'English',
              },
            ],
          },
        },
        include: { animalNames: true },
      });
    } else {
      const hasEn = animal.animalNames?.some((n) => n.languageCode === 'en');
      if (!hasEn) {
        await prisma.animalNames.create({
          data: {
            animalId: animal.id,
            name: animalSeed.name,
            languageCode: 'en',
            languageName: 'English',
          },
        });
      }

      if (!animal.name) {
        await prisma.animal.update({
          where: { id: animal.id },
          data: { name: animalSeed.name },
        });
      }
    }

    // Breeds
    for (const breedSeed of animalSeed.breeds ?? []) {
      if (!breedSeed?.breedName) continue;
      const exists = await prisma.breed.findFirst({
        where: { animalId: animal.id, breedName: breedSeed.breedName },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.breed.create({
        data: { animalId: animal.id, breedName: breedSeed.breedName },
      });
    }

    // Animal products
    for (const productSeed of animalSeed.animalProducts ?? []) {
      if (!productSeed?.name) continue;
      const exists = await prisma.animalProduct.findFirst({
        where: { animalId: animal.id, name: productSeed.name },
        select: { id: true },
      });
      if (exists) continue;
      await prisma.animalProduct.create({
        data: { animalId: animal.id, name: productSeed.name },
      });
    }

    // Diseases
    for (const diseaseSeed of animalSeed.diseases ?? []) {
      if (!diseaseSeed?.name) continue;
      const type = mapDiseaseType(diseaseSeed.type);
      const medication = diseaseSeed.medication ?? 'Not specified';

      const disease =
        (await prisma.disease.findFirst({
          where: { name: diseaseSeed.name, type },
          select: { id: true },
        })) ??
        (await prisma.disease.create({
          data: { name: diseaseSeed.name, type, medication, createdBy },
          select: { id: true },
        }));

      const alreadyLinked = await prisma.animal.findFirst({
        where: { id: animal.id, diseases: { some: { id: disease.id } } },
        select: { id: true },
      });
      if (!alreadyLinked) {
        await prisma.animal.update({
          where: { id: animal.id },
          data: { diseases: { connect: { id: disease.id } } },
        });
      }
    }

    // Pests
    for (const pestSeed of animalSeed.pests ?? []) {
      if (!pestSeed?.name) continue;
      const type = mapPestType(pestSeed.type);
      const medication = pestSeed.medication ?? 'Not specified';

      const pest =
        (await prisma.pest.findFirst({
          where: { name: pestSeed.name, type },
          select: { id: true },
        })) ??
        (await prisma.pest.create({
          data: { name: pestSeed.name, type, medication, createdBy },
          select: { id: true },
        }));

      const alreadyLinked = await prisma.animal.findFirst({
        where: { id: animal.id, pests: { some: { id: pest.id } } },
        select: { id: true },
      });
      if (!alreadyLinked) {
        await prisma.animal.update({
          where: { id: animal.id },
          data: { pests: { connect: { id: pest.id } } },
        });
      }
    }

    // Medicines & vaccines (optional, but seed if provided)
    for (const medicineSeed of animalSeed.medicines ?? []) {
      if (!medicineSeed?.name) continue;
      const medicine =
        (await prisma.medicine.findFirst({
          where: { name: medicineSeed.name },
          select: { id: true },
        })) ??
        (await prisma.medicine.create({
          data: { name: medicineSeed.name },
          select: { id: true },
        }));

      const exists = await prisma.animalMedicine.findFirst({
        where: { animalId: animal.id, medicineId: medicine.id },
        select: { id: true },
      });
      if (!exists) {
        await prisma.animalMedicine.create({
          data: { animalId: animal.id, medicineId: medicine.id },
        });
      }
    }

    for (const vaccineSeed of animalSeed.vaccines ?? []) {
      if (!vaccineSeed?.name) continue;
      const vaccine =
        (await prisma.vaccine.findFirst({
          where: { name: vaccineSeed.name },
          select: { id: true },
        })) ??
        (await prisma.vaccine.create({
          data: { name: vaccineSeed.name },
          select: { id: true },
        }));

      const exists = await prisma.animalVaccine.findFirst({
        where: { animalId: animal.id, vaccineId: vaccine.id },
        select: { id: true },
      });
      if (!exists) {
        await prisma.animalVaccine.create({
          data: { animalId: animal.id, vaccineId: vaccine.id },
        });
      }
    }
  }

  const total = await prisma.animal.count();
  console.log(`Seeded animals (total: ${total})`);
}

