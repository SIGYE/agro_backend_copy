import {
  CollectiveType,
  CooperativeType,
  Gender,
  PrismaClient,
  Status,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

type SeedUserInput = {
  username: string;
  email: string;
  telephone: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  roleName: string;
  locationId?: number | null;
};

const SEED_PASSWORD = 'Test@12345';

async function getDefaultLocationId(prisma: PrismaClient): Promise<number> {
  const loc = await prisma.location.findFirst({ orderBy: { id: 'asc' } });
  if (loc) return loc.id;

  const existingLevel = await prisma.locationLevel.findFirst({
    orderBy: { id: 'asc' },
  });

  const levelId =
    existingLevel?.id ??
    (
      await prisma.locationLevel.create({
        data: {
          order_number: 1,
          name: 'DEV_LEVEL',
          code: 'DEV_LEVEL',
        },
      })
    ).id;

  return (
    await prisma.location.create({
      data: {
        name: 'DEV_LOCATION',
        locationLevelId: levelId,
      },
    })
  ).id;
}

async function getRoleId(prisma: PrismaClient, roleName: string): Promise<string> {
  const role = await prisma.role.findUnique({ where: { name: roleName } });
  if (role) return role.id;
  return (await prisma.role.create({ data: { name: roleName } })).id;
}

async function upsertUser(prisma: PrismaClient, input: SeedUserInput) {
  const roleId = await getRoleId(prisma, input.roleName);
  const hashed = await bcrypt.hash(SEED_PASSWORD, 12);

  const user = await prisma.user.upsert({
    where: { email: input.email },
    create: {
      username: input.username,
      email: input.email,
      telephone: input.telephone,
      firstName: input.firstName,
      lastName: input.lastName,
      nationalId: input.nationalId,
      password: hashed,
      roleId,
      status: Status.ACTIVE,
      gender: Gender.MALE,
      isDefaultPassword: false,
      locationId: input.locationId ?? null,
      country: 1,
    },
    update: {
      username: input.username,
      telephone: input.telephone,
      firstName: input.firstName,
      lastName: input.lastName,
      nationalId: input.nationalId,
      password: hashed,
      roleId,
      status: Status.ACTIVE,
      isDefaultPassword: false,
      locationId: input.locationId ?? null,
      country: 1,
    },
    include: { role: true },
  });

  return user;
}

async function ensureUmufashaRow(prisma: PrismaClient, userId: string) {
  const existing = await prisma.umufashamyumvire.findFirst({ where: { userId } });
  if (existing) return existing;
  return prisma.umufashamyumvire.create({ data: { userId } });
}

async function upsertFarmer(prisma: PrismaClient, userId: string, cooperativeId: string | null) {
  return prisma.farmer.upsert({
    where: { userId },
    create: { userId, cooperativeId },
    update: { cooperativeId },
  });
}

async function ensureBuyerProfile(prisma: PrismaClient, userId: string) {
  const existing = await prisma.buyer.findUnique({ where: { userId } });
  if (existing) return existing;
  return prisma.buyer.create({ data: { userId } });
}

async function ensureCooperativeForManager(params: {
  prisma: PrismaClient;
  managerUserId: string;
  locationId: number;
  name: string;
  telephone: string;
  registrationNumber: string;
  membersNumber: number;
  type: CooperativeType;
  collectiveType: CollectiveType;
}) {
  const existing = await params.prisma.cooperative.findFirst({
    where: { cooperativeManagerId: params.managerUserId },
  });

  if (existing) {
    return params.prisma.cooperative.update({
      where: { id: existing.id },
      data: {
        name: params.name,
        telephone: params.telephone,
        registrationNumber: params.registrationNumber,
        membersNumber: params.membersNumber,
        locationId: params.locationId,
        type: params.type,
        collectiveType: params.collectiveType,
      },
    });
  }

  return params.prisma.cooperative.create({
    data: {
      name: params.name,
      telephone: params.telephone,
      registrationNumber: params.registrationNumber,
      membersNumber: params.membersNumber,
      locationId: params.locationId,
      type: params.type,
      collectiveType: params.collectiveType,
      cooperativeManagerId: params.managerUserId,
    },
  });
}

export async function seedDevUsers(prisma: PrismaClient) {
  console.log('Seeding dev users (login accounts)...');

  const locationId = await getDefaultLocationId(prisma);

  const umufasha = await upsertUser(prisma, {
    username: 'umufasha',
    email: 'umufasha@mail.com',
    telephone: '250700000001',
    firstName: 'Umufasha',
    lastName: 'Myumvire',
    nationalId: '1111111111111111',
    roleName: 'UMUFASHAMYUMVIRE',
    locationId,
  });
  await ensureUmufashaRow(prisma, umufasha.id);
  // Umufasha is also an ordinary farmer (needed for FARMER mode screens/APIs)
  await upsertFarmer(prisma, umufasha.id, null);

  const collectiveLeader = await upsertUser(prisma, {
    username: 'collective_leader',
    email: 'collective.leader@mail.com',
    telephone: '250700000002',
    firstName: 'Collective',
    lastName: 'Leader',
    nationalId: '2222222222222222',
    roleName: 'COLLECTIVE_COOPERATIVE_MANAGER',
    locationId,
  });

  const nonCollectiveLeader = await upsertUser(prisma, {
    username: 'noncollective_leader',
    email: 'noncollective.leader@mail.com',
    telephone: '250700000003',
    firstName: 'NonCollective',
    lastName: 'Leader',
    nationalId: '3333333333333333',
    roleName: 'NON_COLLECTIVE_COOPERATIVE_MANAGER',
    locationId,
  });

  const collectiveCoop = await ensureCooperativeForManager({
    prisma,
    managerUserId: collectiveLeader.id,
    locationId,
    name: 'DEV Collective Cooperative',
    telephone: '250788000001',
    registrationNumber: 'DEV-COOP-001',
    membersNumber: 50,
    type: CooperativeType.COOPERATIVE,
    collectiveType: CollectiveType.COLLECTIVE,
  });

  const nonCollectiveCoop = await ensureCooperativeForManager({
    prisma,
    managerUserId: nonCollectiveLeader.id,
    locationId,
    name: 'DEV Non-Collective Group',
    telephone: '250788000002',
    registrationNumber: 'DEV-ITSINDA-001',
    membersNumber: 20,
    type: CooperativeType.ITSINDA,
    collectiveType: CollectiveType.NON_COLLECTIVE,
  });

  const farmerIndividual = await upsertUser(prisma, {
    username: 'farmer_individual',
    email: 'farmer.individual@mail.com',
    telephone: '250700000010',
    firstName: 'Farmer',
    lastName: 'Individual',
    nationalId: '4444444444444444',
    roleName: 'FARMER',
    locationId,
  });
  await upsertFarmer(prisma, farmerIndividual.id, null);

  const farmerCollective1 = await upsertUser(prisma, {
    username: 'farmer_collective_1',
    email: 'farmer.collective1@mail.com',
    telephone: '250700000011',
    firstName: 'Farmer',
    lastName: 'CollectiveOne',
    nationalId: '5555555555555555',
    roleName: 'FARMER',
    locationId,
  });
  await upsertFarmer(prisma, farmerCollective1.id, collectiveCoop.id);

  const farmerCollective2 = await upsertUser(prisma, {
    username: 'farmer_collective_2',
    email: 'farmer.collective2@mail.com',
    telephone: '250700000012',
    firstName: 'Farmer',
    lastName: 'CollectiveTwo',
    nationalId: '6666666666666666',
    roleName: 'FARMER',
    locationId,
  });
  await upsertFarmer(prisma, farmerCollective2.id, collectiveCoop.id);

  const farmerNonCollective1 = await upsertUser(prisma, {
    username: 'farmer_noncollective_1',
    email: 'farmer.noncollective1@mail.com',
    telephone: '250700000013',
    firstName: 'Farmer',
    lastName: 'NonCollectiveOne',
    nationalId: '7777777777777777',
    roleName: 'FARMER',
    locationId,
  });
  await upsertFarmer(prisma, farmerNonCollective1.id, nonCollectiveCoop.id);

  const farmerNonCollective2 = await upsertUser(prisma, {
    username: 'farmer_noncollective_2',
    email: 'farmer.noncollective2@mail.com',
    telephone: '250700000014',
    firstName: 'Farmer',
    lastName: 'NonCollectiveTwo',
    nationalId: '8888888888888888',
    roleName: 'FARMER',
    locationId,
  });
  await upsertFarmer(prisma, farmerNonCollective2.id, nonCollectiveCoop.id);

  const buyer = await upsertUser(prisma, {
    username: 'buyer',
    email: 'buyer@mail.com',
    telephone: '250700000020',
    firstName: 'Buyer',
    lastName: 'User',
    nationalId: '9999999999999999',
    roleName: 'BUYER',
    locationId,
  });
  await ensureBuyerProfile(prisma, buyer.id);

  await upsertUser(prisma, {
    username: 'admin',
    email: 'admin@mail.com',
    telephone: '250700000030',
    firstName: 'Admin',
    lastName: 'User',
    nationalId: '1212121212121212',
    roleName: 'ADMIN',
    locationId,
  });

  await upsertUser(prisma, {
    username: 'dev_admin',
    email: 'devadmin@mail.com',
    telephone: '250700000031',
    firstName: 'Dev',
    lastName: 'Admin',
    nationalId: '1313131313131313',
    roleName: 'DEV_ADMIN',
    locationId,
  });

  console.log('\nDev login accounts (password is the same for all):');
  console.log(`Password: ${SEED_PASSWORD}`);
  console.log('- UMUFASHAMYUMVIRE: umufasha@mail.com');
  console.log('- COLLECTIVE leader: collective.leader@mail.com');
  console.log('- NON-COLLECTIVE leader: noncollective.leader@mail.com');
  console.log('- FARMER (individual): farmer.individual@mail.com');
  console.log('- FARMER (collective #1): farmer.collective1@mail.com');
  console.log('- FARMER (collective #2): farmer.collective2@mail.com');
  console.log('- FARMER (non-collective #1): farmer.noncollective1@mail.com');
  console.log('- FARMER (non-collective #2): farmer.noncollective2@mail.com');
  console.log('- BUYER: buyer@mail.com');
  console.log('- ADMIN: admin@mail.com');
  console.log('- DEV_ADMIN: devadmin@mail.com');
}
