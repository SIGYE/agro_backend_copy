import { PrismaClient, SeasonStatus } from '@prisma/client';

type HarvestSeasonSeed = {
  name: string;
  startDate: Date;
  endDate: Date;
  seasonStatus: SeasonStatus;
};

function buildCurrentYearSeasons(): HarvestSeasonSeed[] {
  const now = new Date();
  const year = now.getFullYear();

  const seasonAStart = new Date(Date.UTC(year, 9, 1)); // Oct 1
  const seasonAEnd = new Date(Date.UTC(year + 1, 1, 28)); // Feb 28 (next year)
  const seasonBStart = new Date(Date.UTC(year, 2, 1)); // Mar 1
  const seasonBEnd = new Date(Date.UTC(year, 5, 30)); // Jun 30
  const seasonCStart = new Date(Date.UTC(year, 6, 1)); // Jul 1
  const seasonCEnd = new Date(Date.UTC(year, 8, 30)); // Sep 30

  const inRange = (d: Date, a: Date, b: Date) => d >= a && d <= b;

  const aStatus = inRange(now, seasonAStart, seasonAEnd)
    ? SeasonStatus.ON_GOING
    : SeasonStatus.ENDED;
  const bStatus = inRange(now, seasonBStart, seasonBEnd)
    ? SeasonStatus.ON_GOING
    : SeasonStatus.ENDED;
  const cStatus = inRange(now, seasonCStart, seasonCEnd)
    ? SeasonStatus.ON_GOING
    : SeasonStatus.ENDED;

  return [
    { name: `Season A ${year}`, startDate: seasonAStart, endDate: seasonAEnd, seasonStatus: aStatus },
    { name: `Season B ${year}`, startDate: seasonBStart, endDate: seasonBEnd, seasonStatus: bStatus },
    { name: `Season C ${year}`, startDate: seasonCStart, endDate: seasonCEnd, seasonStatus: cStatus },
  ];
}

export async function seedHarvestSeasons(prisma: PrismaClient) {
  console.log('Seeding harvest seasons...');

  const seeds = buildCurrentYearSeasons();

  for (const seed of seeds) {
    const existing = await prisma.harvestSeason.findFirst({
      where: { name: seed.name },
      select: { id: true },
    });

    if (existing) {
      await prisma.harvestSeason.update({
        where: { id: existing.id },
        data: {
          startDate: seed.startDate,
          endDate: seed.endDate,
          seasonStatus: seed.seasonStatus,
        },
      });
      continue;
    }

    await prisma.harvestSeason.create({
      data: seed,
    });
  }

  const total = await prisma.harvestSeason.count();
  console.log(`Seeded harvest seasons (total: ${total})`);
}

