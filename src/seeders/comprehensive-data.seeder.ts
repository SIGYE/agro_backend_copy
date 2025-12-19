import {
  CollectiveType,
  CooperativeType,
  Gender,
  PrismaClient,
  Status,
  SeasonStatus,
  OrderStatus,
  OrderType,
  Activities,
  NotificationType,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SEED_PASSWORD = 'Test@12345';

// Rwandan names for realistic data
const RWANDAN_FIRST_NAMES_MALE = [
  'Jean', 'Pierre', 'Emmanuel', 'Patrick', 'Claude', 'Innocent', 'Eric', 'Faustin',
  'Joseph', 'Celestin', 'Theophile', 'Francois', 'Augustin', 'Damascene', 'Jean-Baptiste',
  'Olivier', 'Denis', 'Pascal', 'Alphonse', 'Gilbert'
];

const RWANDAN_FIRST_NAMES_FEMALE = [
  'Marie', 'Jeanne', 'Claudine', 'Esperance', 'Olive', 'Alice', 'Beatrice', 'Chantal',
  'Divine', 'Grace', 'Jacqueline', 'Josiane', 'Lea', 'Nadine', 'Odette',
  'Patricia', 'Rosine', 'Sophie', 'Valentine', 'Yvonne'
];

const RWANDAN_LAST_NAMES = [
  'Uwimana', 'Mukiza', 'Habimana', 'Niyonzima', 'Ndayisaba', 'Hakizimana', 'Nshimiyimana',
  'Bizimana', 'Nsengimana', 'Tuyisenge', 'Mugisha', 'Irakoze', 'Niyigena', 'Uwase',
  'Ingabire', 'Mukamana', 'Niyonsaba', 'Uwera', 'Izabayo', 'Muhire'
];

const COOPERATIVE_NAMES = [
  'Tuzamurane', 'Abadahigwa', 'Duterimbere', 'Twisungane', 'Abahujurumbwana',
  'Inkingi', 'Abakundakawa', 'Impuzamugambi', 'Abanyamwuga', 'Abahuza'
];

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function generatePhoneNumber(): string {
  return `25078${randomInt(1000000, 9999999)}`;
}

function generateNationalId(): string {
  return `1${randomInt(100000000000000, 999999999999999)}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function generateOrderNumber(): string {
  return `ORD-${Date.now()}-${randomInt(1000, 9999)}`;
}

async function getDefaultLocationId(prisma: PrismaClient): Promise<number> {
  const loc = await prisma.location.findFirst({ orderBy: { id: 'asc' } });
  if (loc) return loc.id;
  return 1;
}

async function getRoleId(prisma: PrismaClient, roleName: string): Promise<string> {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) return role.id;
  return (await prisma.role.create({ data: { name: roleName } })).id;
}

async function createUser(prisma: PrismaClient, data: {
  email: string;
  telephone: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  roleName: string;
  locationId: number;
  gender: Gender;
}) {
  const roleId = await getRoleId(prisma, data.roleName);
  const hashed = await bcrypt.hash(SEED_PASSWORD, 12);
  const username = `${data.firstName.toLowerCase()}_${randomInt(100, 999)}`;

  return prisma.user.create({
    data: {
      username,
      email: data.email,
      telephone: data.telephone,
      firstName: data.firstName,
      lastName: data.lastName,
      nationalId: data.nationalId,
      password: hashed,
      roleId,
      status: Status.ACTIVE,
      gender: data.gender,
      isDefaultPassword: false,
      locationId: data.locationId,
      country: 1,
      dob: new Date(randomInt(1960, 2000), randomInt(0, 11), randomInt(1, 28)),
    },
    include: { role: true },
  });
}

export async function seedComprehensiveData(prisma: PrismaClient) {
  console.log('\n========================================');
  console.log('Seeding comprehensive demo data...');
  console.log('========================================\n');

  const locationId = await getDefaultLocationId(prisma);

  // Get reference data
  const metrics = await prisma.metric.findMany();
  const harvestSeasons = await prisma.harvestSeason.findMany();
  const fertilizers = await prisma.feterlizer.findMany();
  const cropTypes = await prisma.cropType.findMany({ include: { crop: true, seedStrains: true } });
  const animals = await prisma.animal.findMany({ include: { breeds: true, animalProducts: true } });

  if (metrics.length === 0 || harvestSeasons.length === 0 || cropTypes.length === 0) {
    console.log('Reference data not found. Please run base seeders first.');
    return;
  }

  const defaultMetric = metrics[0];
  const devAdmin = await prisma.user.findUnique({ where: { email: 'devadmin@mail.com' } });
  if (!devAdmin) {
    console.log('Dev admin not found. Please run base seeders first.');
    return;
  }

  // =====================================================
  // 1. CREATE MORE INDIVIDUAL FARMERS (15 farmers)
  // =====================================================
  console.log('Creating individual farmers...');
  const individualFarmers: any[] = [];

  for (let i = 1; i <= 15; i++) {
    const isMale = Math.random() > 0.4;
    const firstName = isMale
      ? randomElement(RWANDAN_FIRST_NAMES_MALE)
      : randomElement(RWANDAN_FIRST_NAMES_FEMALE);
    const lastName = randomElement(RWANDAN_LAST_NAMES);

    try {
      const user = await createUser(prisma, {
        email: `farmer_ind_${i}@agro.rw`,
        telephone: generatePhoneNumber(),
        firstName,
        lastName,
        nationalId: generateNationalId(),
        roleName: 'FARMER',
        locationId,
        gender: isMale ? Gender.MALE : Gender.FEMALE,
      });

      const farmer = await prisma.farmer.create({
        data: { userId: user.id, cooperativeId: null },
      });

      individualFarmers.push({ user, farmer });
    } catch (e) {
      // Skip if user already exists
    }
  }
  console.log(`Created ${individualFarmers.length} individual farmers`);

  // =====================================================
  // 2. CREATE AMATINDA (ITSINDA) - 0-15 members
  // Both Collective and Non-Collective types
  // =====================================================
  console.log('Creating Amatinda (Itsinda) - small groups 0-15 members...');
  const amatindaCollective: any[] = [];
  const amatindaNonCollective: any[] = [];

  // Amatinda Collective (3 groups)
  for (let i = 1; i <= 3; i++) {
    const isMale = Math.random() > 0.3;
    const firstName = isMale
      ? randomElement(RWANDAN_FIRST_NAMES_MALE)
      : randomElement(RWANDAN_FIRST_NAMES_FEMALE);
    const lastName = randomElement(RWANDAN_LAST_NAMES);

    try {
      const managerUser = await createUser(prisma, {
        email: `itsinda_collective_${i}@agro.rw`,
        telephone: generatePhoneNumber(),
        firstName,
        lastName,
        nationalId: generateNationalId(),
        roleName: 'COLLECTIVE_COOPERATIVE_MANAGER',
        locationId,
        gender: isMale ? Gender.MALE : Gender.FEMALE,
      });

      const coop = await prisma.cooperative.create({
        data: {
          name: `${randomElement(COOPERATIVE_NAMES)} Itsinda Collective ${i}`,
          telephone: generatePhoneNumber(),
          registrationNumber: `ITS-COL-${1000 + i}`,
          membersNumber: randomInt(5, 15), // 0-15 members for Itsinda
          locationId,
          type: CooperativeType.ITSINDA, // Amatinda
          collectiveType: CollectiveType.COLLECTIVE,
          cooperativeManagerId: managerUser.id,
        },
      });

      amatindaCollective.push({ manager: managerUser, coop });
    } catch (e) {
      // Skip if already exists
    }
  }

  // Amatinda Non-Collective (3 groups)
  for (let i = 1; i <= 3; i++) {
    const isMale = Math.random() > 0.3;
    const firstName = isMale
      ? randomElement(RWANDAN_FIRST_NAMES_MALE)
      : randomElement(RWANDAN_FIRST_NAMES_FEMALE);
    const lastName = randomElement(RWANDAN_LAST_NAMES);

    try {
      const managerUser = await createUser(prisma, {
        email: `itsinda_noncollective_${i}@agro.rw`,
        telephone: generatePhoneNumber(),
        firstName,
        lastName,
        nationalId: generateNationalId(),
        roleName: 'NON_COLLECTIVE_COOPERATIVE_MANAGER',
        locationId,
        gender: isMale ? Gender.MALE : Gender.FEMALE,
      });

      const coop = await prisma.cooperative.create({
        data: {
          name: `${randomElement(COOPERATIVE_NAMES)} Itsinda ${i}`,
          telephone: generatePhoneNumber(),
          registrationNumber: `ITS-NC-${1000 + i}`,
          membersNumber: randomInt(5, 15), // 0-15 members for Itsinda
          locationId,
          type: CooperativeType.ITSINDA, // Amatinda
          collectiveType: CollectiveType.NON_COLLECTIVE,
          cooperativeManagerId: managerUser.id,
        },
      });

      amatindaNonCollective.push({ manager: managerUser, coop });
    } catch (e) {
      // Skip if already exists
    }
  }
  console.log(`Created ${amatindaCollective.length} Amatinda Collective groups`);
  console.log(`Created ${amatindaNonCollective.length} Amatinda Non-Collective groups`);

  // =====================================================
  // 3. CREATE ASSOCIATIONS (COOPERATIVE) - 15+ members
  // Both Collective and Non-Collective types
  // =====================================================
  console.log('Creating Associations - larger groups 15+ members...');
  const associationCollective: any[] = [];
  const associationNonCollective: any[] = [];

  // Association Collective (3 groups)
  for (let i = 1; i <= 3; i++) {
    const isMale = Math.random() > 0.3;
    const firstName = isMale
      ? randomElement(RWANDAN_FIRST_NAMES_MALE)
      : randomElement(RWANDAN_FIRST_NAMES_FEMALE);
    const lastName = randomElement(RWANDAN_LAST_NAMES);

    try {
      const managerUser = await createUser(prisma, {
        email: `assoc_collective_${i}@agro.rw`,
        telephone: generatePhoneNumber(),
        firstName,
        lastName,
        nationalId: generateNationalId(),
        roleName: 'COLLECTIVE_COOPERATIVE_MANAGER',
        locationId,
        gender: isMale ? Gender.MALE : Gender.FEMALE,
      });

      const coop = await prisma.cooperative.create({
        data: {
          name: `${randomElement(COOPERATIVE_NAMES)} Association Collective ${i}`,
          telephone: generatePhoneNumber(),
          registrationNumber: `ASS-COL-${2000 + i}`,
          membersNumber: randomInt(20, 100), // 15+ members for Association
          locationId,
          type: CooperativeType.COOPERATIVE, // Association
          collectiveType: CollectiveType.COLLECTIVE,
          cooperativeManagerId: managerUser.id,
        },
      });

      associationCollective.push({ manager: managerUser, coop });
    } catch (e) {
      // Skip if already exists
    }
  }

  // Association Non-Collective (3 groups)
  for (let i = 1; i <= 3; i++) {
    const isMale = Math.random() > 0.3;
    const firstName = isMale
      ? randomElement(RWANDAN_FIRST_NAMES_MALE)
      : randomElement(RWANDAN_FIRST_NAMES_FEMALE);
    const lastName = randomElement(RWANDAN_LAST_NAMES);

    try {
      const managerUser = await createUser(prisma, {
        email: `assoc_noncollective_${i}@agro.rw`,
        telephone: generatePhoneNumber(),
        firstName,
        lastName,
        nationalId: generateNationalId(),
        roleName: 'NON_COLLECTIVE_COOPERATIVE_MANAGER',
        locationId,
        gender: isMale ? Gender.MALE : Gender.FEMALE,
      });

      const coop = await prisma.cooperative.create({
        data: {
          name: `${randomElement(COOPERATIVE_NAMES)} Association ${i}`,
          telephone: generatePhoneNumber(),
          registrationNumber: `ASS-NC-${2000 + i}`,
          membersNumber: randomInt(20, 100), // 15+ members for Association
          locationId,
          type: CooperativeType.COOPERATIVE, // Association
          collectiveType: CollectiveType.NON_COLLECTIVE,
          cooperativeManagerId: managerUser.id,
        },
      });

      associationNonCollective.push({ manager: managerUser, coop });
    } catch (e) {
      // Skip if already exists
    }
  }
  console.log(`Created ${associationCollective.length} Association Collective groups`);
  console.log(`Created ${associationNonCollective.length} Association Non-Collective groups`);

  // Combine all cooperatives for later use
  const collectives = [...amatindaCollective, ...associationCollective];
  const nonCollectives = [...amatindaNonCollective, ...associationNonCollective];

  // =====================================================
  // 4. ADD FARMERS TO COOPERATIVES
  // =====================================================
  console.log('Adding farmers to cooperatives...');

  // Add 5 farmers to each collective
  for (const collective of collectives) {
    for (let i = 1; i <= 5; i++) {
      const isMale = Math.random() > 0.4;
      const firstName = isMale
        ? randomElement(RWANDAN_FIRST_NAMES_MALE)
        : randomElement(RWANDAN_FIRST_NAMES_FEMALE);
      const lastName = randomElement(RWANDAN_LAST_NAMES);

      try {
        const user = await createUser(prisma, {
          email: `farmer_coll_${collective.coop.id.slice(0, 8)}_${i}@agro.rw`,
          telephone: generatePhoneNumber(),
          firstName,
          lastName,
          nationalId: generateNationalId(),
          roleName: 'FARMER',
          locationId,
          gender: isMale ? Gender.MALE : Gender.FEMALE,
        });

        await prisma.farmer.create({
          data: { userId: user.id, cooperativeId: collective.coop.id },
        });
      } catch (e) {
        // Skip
      }
    }
  }

  // Add 4 farmers to each non-collective
  for (const nonCollective of nonCollectives) {
    for (let i = 1; i <= 4; i++) {
      const isMale = Math.random() > 0.4;
      const firstName = isMale
        ? randomElement(RWANDAN_FIRST_NAMES_MALE)
        : randomElement(RWANDAN_FIRST_NAMES_FEMALE);
      const lastName = randomElement(RWANDAN_LAST_NAMES);

      try {
        const user = await createUser(prisma, {
          email: `farmer_ncoll_${nonCollective.coop.id.slice(0, 8)}_${i}@agro.rw`,
          telephone: generatePhoneNumber(),
          firstName,
          lastName,
          nationalId: generateNationalId(),
          roleName: 'FARMER',
          locationId,
          gender: isMale ? Gender.MALE : Gender.FEMALE,
        });

        await prisma.farmer.create({
          data: { userId: user.id, cooperativeId: nonCollective.coop.id },
        });
      } catch (e) {
        // Skip
      }
    }
  }

  console.log('Added farmers to cooperatives');

  // =====================================================
  // 5. CREATE CROP DATA FOR FARMERS
  // =====================================================
  console.log('Creating crop registrations and seasons for farmers...');

  const allFarmers = await prisma.farmer.findMany({
    include: { user: true, cooperative: true },
  });

  for (const farmer of allFarmers) {
    // Each farmer gets 1-3 crop registrations
    const numCrops = randomInt(1, 3);
    const selectedCropTypes = cropTypes.sort(() => Math.random() - 0.5).slice(0, numCrops);

    for (const cropType of selectedCropTypes) {
      if (cropType.seedStrains.length === 0) continue;

      // Create crop registration
      const existingReg = await prisma.cropFarmerRegistration.findFirst({
        where: { farmerId: farmer.id, cropTypeId: cropType.id },
      });

      if (!existingReg) {
        await prisma.cropFarmerRegistration.create({
          data: {
            farmerId: farmer.id,
            cropTypeId: cropType.id,
          },
        });
      }

      // Create 1-3 seasons (mix of ongoing and ended)
      const numSeasons = randomInt(1, 3);
      for (let s = 0; s < numSeasons; s++) {
        const isEnded = s > 0 || Math.random() > 0.6;
        const harvestSeason = randomElement(harvestSeasons);
        const seedStrain = randomElement(cropType.seedStrains);
        const plantationArea = randomFloat(0.5, 3);
        const expectedYield = randomFloat(100, 1000);
        const startDate = daysAgo(isEnded ? randomInt(120, 365) : randomInt(10, 60));
        const endDate = isEnded ? daysAgo(randomInt(10, 90)) : daysFromNow(randomInt(30, 90));

        try {
          const season = await prisma.season.create({
            data: {
              name: `${cropType.name} - ${farmer.user.firstName} - S${s + 1}`,
              plantationArea,
              seeds: randomFloat(10, 100),
              produceHarvested: isEnded ? randomFloat(expectedYield * 0.7, expectedYield * 1.1) : 0,
              expectedYield,
              startDate,
              endDate,
              seasonStatus: isEnded ? SeasonStatus.ENDED : SeasonStatus.ON_GOING,
              cropTypeId: cropType.id,
              seedStrainId: seedStrain.id,
              farmerId: farmer.id,
              harvestSeasonId: harvestSeason.id,
              metricId: defaultMetric.id,
            },
          });

          // Add fertilizer usage
          if (fertilizers.length > 0) {
            const numFertilizers = randomInt(1, 2);
            for (let f = 0; f < numFertilizers; f++) {
              const fert = fertilizers[f % fertilizers.length];
              await prisma.cropFertilizerFarmerRegistration.create({
                data: {
                  seasonId: season.id,
                  fertilizerId: fert.id,
                  measurementId: defaultMetric.id,
                  amount: randomFloat(5, 50),
                },
              });
            }
          }

          // Add farming activities for ongoing seasons
          if (!isEnded) {
            const activityTypes = [Activities.FERTILIZATION, Activities.MEDICATION, Activities.VACCINATION];
            const numActivities = randomInt(1, 2);
            for (let a = 0; a < numActivities; a++) {
              await prisma.farmingActivity.create({
                data: {
                  seasonId: season.id,
                  activity: randomElement(activityTypes),
                  date: daysAgo(randomInt(5, 30)),
                  amount: randomFloat(10, 100),
                },
              });
            }
          }

          // Add harvests for ended seasons
          if (isEnded) {
            await prisma.harvest.create({
              data: {
                seasonId: season.id,
                name: `Harvest - ${cropType.name}`,
                amount: randomFloat(expectedYield * 0.7, expectedYield * 1.1),
                harvestDate: endDate,
              },
            });
          }
        } catch (e) {
          // Skip duplicates
        }
      }
    }
  }

  console.log('Created crop data for farmers');

  // =====================================================
  // 6. CREATE COOPERATIVE SEASONS (FOR COLLECTIVES)
  // =====================================================
  console.log('Creating seasons for collective cooperatives...');

  const allCollectives = await prisma.cooperative.findMany({
    where: { collectiveType: CollectiveType.COLLECTIVE },
  });

  for (const coop of allCollectives) {
    const numCrops = randomInt(2, 4);
    const selectedCropTypes = cropTypes.sort(() => Math.random() - 0.5).slice(0, numCrops);

    for (const cropType of selectedCropTypes) {
      if (cropType.seedStrains.length === 0) continue;

      // Register crop for cooperative
      const existingReg = await prisma.cooperativeCropRegistration.findFirst({
        where: { cooperativeId: coop.id, cropTypeId: cropType.id },
      });

      if (!existingReg) {
        await prisma.cooperativeCropRegistration.create({
          data: {
            cooperativeId: coop.id,
            cropTypeId: cropType.id,
          },
        });
      }

      // Create 2-4 seasons
      const numSeasons = randomInt(2, 4);
      for (let s = 0; s < numSeasons; s++) {
        const isEnded = s > 0;
        const harvestSeason = randomElement(harvestSeasons);
        const seedStrain = randomElement(cropType.seedStrains);
        const plantationArea = randomFloat(5, 30);
        const expectedYield = randomFloat(500, 5000);
        const startDate = daysAgo(isEnded ? randomInt(120, 365) : randomInt(10, 60));
        const endDate = isEnded ? daysAgo(randomInt(10, 90)) : daysFromNow(randomInt(30, 90));

        try {
          const season = await prisma.season.create({
            data: {
              name: `${cropType.name} - ${coop.name} - S${s + 1}`,
              plantationArea,
              seeds: randomFloat(50, 500),
              produceHarvested: isEnded ? randomFloat(expectedYield * 0.7, expectedYield * 1.1) : 0,
              expectedYield,
              startDate,
              endDate,
              seasonStatus: isEnded ? SeasonStatus.ENDED : SeasonStatus.ON_GOING,
              cropTypeId: cropType.id,
              seedStrainId: seedStrain.id,
              cooperativeId: coop.id,
              harvestSeasonId: harvestSeason.id,
              metricId: defaultMetric.id,
            },
          });

          // Add fertilizers
          if (fertilizers.length > 0) {
            const numFertilizers = randomInt(2, 3);
            for (let f = 0; f < numFertilizers; f++) {
              const fert = fertilizers[f % fertilizers.length];
              await prisma.cropFertilizerFarmerRegistration.create({
                data: {
                  seasonId: season.id,
                  fertilizerId: fert.id,
                  measurementId: defaultMetric.id,
                  amount: randomFloat(20, 200),
                },
              });
            }
          }

          // Add harvests for ended seasons
          if (isEnded) {
            await prisma.harvest.create({
              data: {
                seasonId: season.id,
                name: `Harvest - ${cropType.name}`,
                amount: randomFloat(expectedYield * 0.7, expectedYield * 1.1),
                harvestDate: endDate,
              },
            });
          }
        } catch (e) {
          // Skip
        }
      }
    }
  }

  console.log('Created cooperative seasons');

  // =====================================================
  // 7. CREATE LIVESTOCK DATA
  // =====================================================
  console.log('Creating livestock registrations...');

  if (animals.length > 0) {
    for (const farmer of allFarmers.slice(0, 20)) {
      const numAnimals = randomInt(1, 2);
      const selectedAnimals = animals.sort(() => Math.random() - 0.5).slice(0, numAnimals);

      for (const animal of selectedAnimals) {
        const existingReg = await prisma.animalFarmerRegistration.findFirst({
          where: { farmerId: farmer.id, animalId: animal.id },
        });

        if (!existingReg) {
          try {
            await prisma.animalFarmerRegistration.create({
              data: {
                farmerId: farmer.id,
                animalId: animal.id,
                totalNumber: randomInt(5, 50),
                maleNumber: randomInt(2, 20),
                femaleNumber: randomInt(3, 30),
              },
            });
          } catch (e) {
            // Skip
          }
        }
      }
    }
  }

  console.log('Created livestock data');

  // =====================================================
  // 8. CREATE CROP LISTINGS
  // =====================================================
  console.log('Creating crop listings...');

  const farmersWithCrops = await prisma.farmer.findMany({
    include: {
      cropFarmerRegistrations: { include: { cropType: true } },
      user: true,
    },
    take: 15,
  });

  for (const farmer of farmersWithCrops) {
    if (farmer.cropFarmerRegistrations.length === 0) continue;

    const reg = randomElement(farmer.cropFarmerRegistrations);
    
    const existingListing = await prisma.cropListing.findFirst({
      where: { farmerId: farmer.id, cropTypeId: reg.cropTypeId },
    });

    if (!existingListing) {
      try {
        await prisma.cropListing.create({
          data: {
            cropTypeId: reg.cropTypeId,
            farmerId: farmer.id,
            pricePerKg: randomFloat(200, 2000),
            totalAvailableKg: randomFloat(100, 1000),
            availableKg: randomFloat(50, 500),
            minimumOrderKg: randomFloat(5, 20),
            locationId,
            isActive: Math.random() > 0.2,
          },
        });
      } catch (e) {
        // Skip
      }
    }
  }

  // Add listings for cooperatives
  for (const coop of allCollectives.slice(0, 3)) {
    const coopRegs = await prisma.cooperativeCropRegistration.findMany({
      where: { cooperativeId: coop.id },
      include: { cropType: true },
    });

    for (const reg of coopRegs.slice(0, 2)) {
      const existingListing = await prisma.cropListing.findFirst({
        where: { cooperativeId: coop.id, cropTypeId: reg.cropTypeId },
      });

      if (!existingListing) {
        try {
          await prisma.cropListing.create({
            data: {
              cropTypeId: reg.cropTypeId,
              cooperativeId: coop.id,
              pricePerKg: randomFloat(150, 1500),
              totalAvailableKg: randomFloat(500, 5000),
              availableKg: randomFloat(200, 3000),
              minimumOrderKg: randomFloat(10, 50),
              locationId,
              isActive: true,
            },
          });
        } catch (e) {
          // Skip
        }
      }
    }
  }

  console.log('Created crop listings');

  // =====================================================
  // 9. CREATE BUYERS AND ORDERS
  // =====================================================
  console.log('Creating additional buyers and orders...');

  // Create more buyers
  for (let i = 1; i <= 5; i++) {
    const isMale = Math.random() > 0.4;
    const firstName = isMale
      ? randomElement(RWANDAN_FIRST_NAMES_MALE)
      : randomElement(RWANDAN_FIRST_NAMES_FEMALE);
    const lastName = randomElement(RWANDAN_LAST_NAMES);

    try {
      const user = await createUser(prisma, {
        email: `buyer_${i}@agro.rw`,
        telephone: generatePhoneNumber(),
        firstName,
        lastName,
        nationalId: generateNationalId(),
        roleName: 'BUYER',
        locationId,
        gender: isMale ? Gender.MALE : Gender.FEMALE,
      });

      await prisma.buyer.create({
        data: { userId: user.id },
      });
    } catch (e) {
      // Skip
    }
  }

  // Create orders
  const buyers = await prisma.buyer.findMany({ include: { user: true } });
  const listings = await prisma.cropListing.findMany({
    where: { isActive: true },
    include: {
      cropType: { include: { crop: true } },
      farmer: { include: { user: true } },
      cooperative: true,
    },
    take: 20,
  });

  for (const buyer of buyers) {
    const numOrders = randomInt(1, 3);
    const selectedListings = listings.sort(() => Math.random() - 0.5).slice(0, numOrders);

    for (const listing of selectedListings) {
      const quantity = randomFloat(listing.minimumOrderKg, Math.min(listing.availableKg * 0.5, 100));
      const totalAmount = quantity * listing.pricePerKg;
      const orderStatuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.SHIPPED, OrderStatus.DELIVERED];
      const status = randomElement(orderStatuses);
      
      // Determine order type
      let orderType: OrderType;
      if (listing.farmerId) {
        orderType = OrderType.FARMER;
      } else if (listing.cooperative?.collectiveType === CollectiveType.COLLECTIVE) {
        orderType = OrderType.COLLECTIVE_COOPERATIVE;
      } else {
        orderType = OrderType.NON_COLLECTIVE_COOPERATIVE;
      }

      try {
        await prisma.order.create({
          data: {
            buyerId: buyer.id,
            farmerId: listing.farmerId,
            cooperativeId: listing.cooperativeId,
            orderNumber: generateOrderNumber(),
            itemsSubtotal: totalAmount,
            totalAmount,
            status,
            orderType,
            deliveryAddress: `${randomElement(RWANDAN_LAST_NAMES)} Street, Kigali`,
          },
        });
      } catch (e) {
        // Skip
      }
    }
  }

  console.log('Created buyers and orders');

  // =====================================================
  // 10. CREATE NOTIFICATIONS
  // =====================================================
  console.log('Creating notifications...');

  const allUsers = await prisma.user.findMany({ take: 30 });
  const notificationTypes = [
    { type: NotificationType.ORDER_STATUS_CHANGED, title: 'Order Update', message: 'Your order status has been updated.' },
    { type: NotificationType.PAYMENT_SUCCESS, title: 'Payment Received', message: 'Payment has been received for your order.' },
    { type: NotificationType.ORDER_REQUEST, title: 'New Order', message: 'You have received a new order request.' },
  ];

  for (const user of allUsers) {
    const numNotifications = randomInt(1, 4);
    for (let n = 0; n < numNotifications; n++) {
      const notif = randomElement(notificationTypes);
      try {
        await prisma.notification.create({
          data: {
            recipientUserId: user.id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            readAt: Math.random() > 0.5 ? new Date() : null,
            data: {},
          },
        });
      } catch (e) {
        // Skip
      }
    }
  }

  console.log('Created notifications');

  // =====================================================
  // SUMMARY
  // =====================================================
  const totalFarmers = await prisma.farmer.count();
  const totalCoops = await prisma.cooperative.count();
  const totalSeasons = await prisma.season.count();
  const totalOrders = await prisma.order.count();
  const totalListings = await prisma.cropListing.count();

  console.log('\n========================================');
  console.log('SEEDING COMPLETED SUCCESSFULLY!');
  console.log('========================================');
  console.log(`Total Farmers: ${totalFarmers}`);
  console.log(`Total Cooperatives: ${totalCoops}`);
  console.log(`Total Seasons: ${totalSeasons}`);
  console.log(`Total Crop Listings: ${totalListings}`);
  console.log(`Total Orders: ${totalOrders}`);
  console.log('========================================\n');
}
