import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import * as request from 'supertest'
import { AppModule } from './../src/app.module'
import { PrismaClient, Gender, Status } from '@prisma/client'
import * as bcrypt from 'bcrypt'

describe('AppController (e2e)', () => {
  let app: INestApplication
  let prisma: PrismaClient
  let locationId: number
  const e2ePassword = 'Test@12345'
  const e2eUmufashaEmail = 'e2e.umufasha@mail.com'

  beforeAll(async () => {
    prisma = new PrismaClient()

    const loc = await prisma.location.findFirst({ orderBy: { id: 'asc' } })
    if (loc) {
      locationId = loc.id
    } else {
      const level = await prisma.locationLevel.create({
        data: { order_number: 1, name: 'E2E_LEVEL', code: 'E2E_LEVEL' },
      })
      const created = await prisma.location.create({
        data: { name: 'E2E_LOCATION', locationLevelId: level.id },
      })
      locationId = created.id
    }

    const role = await prisma.role.upsert({
      where: { name: 'UMUFASHAMYUMVIRE' },
      create: { name: 'UMUFASHAMYUMVIRE' },
      update: {},
    })

    const hashed = await bcrypt.hash(e2ePassword, 12)
    await prisma.user.upsert({
      where: { email: e2eUmufashaEmail },
      create: {
        username: 'e2e_umufasha',
        email: e2eUmufashaEmail,
        telephone: '250700009999',
        firstName: 'E2E',
        lastName: 'Umufasha',
        gender: Gender.MALE,
        password: hashed,
        roleId: role.id,
        status: Status.ACTIVE,
        isDefaultPassword: false,
        locationId,
        country: 1,
        locationChildrenIds: JSON.stringify([locationId]),
      },
      update: {
        password: hashed,
        roleId: role.id,
        status: Status.ACTIVE,
        isDefaultPassword: false,
        locationId,
        country: 1,
        locationChildrenIds: JSON.stringify([locationId]),
      },
    })

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    await app.init()
  })

  afterAll(async () => {
    await app?.close()
    await prisma?.$disconnect()
  })

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect((res) => {
        expect(res.text).toContain('AGRICULTURE APP BACKEND APIs')
      })
  })

  it('/auth/login/creds (POST) returns token', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login/creds')
      .send({ credential: e2eUmufashaEmail, password: e2ePassword })
      .expect(201)

    expect(res.body?.success).toBe(true)
    expect(res.body?.data?.token).toBeTruthy()
    expect(res.body?.data?.role?.name).toBe('UMUFASHAMYUMVIRE')
  })

  it('/auth/active-role (POST) allows Umufasha to switch to FARMER and access /farmer/me', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login/creds')
      .send({ credential: e2eUmufashaEmail, password: e2ePassword })
      .expect(201)

    const token = login.body?.data?.token
    expect(token).toBeTruthy()

    const activeRole = await request(app.getHttpServer())
      .post('/auth/active-role')
      .set('Authorization', `Bearer ${token}`)
      .send({ activeRole: 'FARMER' })
      .expect(201)

    expect(activeRole.body?.success).toBe(true)
    expect(activeRole.body?.data?.activeRole).toBe('FARMER')
    expect(activeRole.body?.data?.token).toBeTruthy()

    const farmerMe = await request(app.getHttpServer())
      .get('/farmer/me')
      .set('Authorization', `Bearer ${activeRole.body.data.token}`)
      .expect(200)

    expect(farmerMe.body?.success).toBe(true)
    expect(farmerMe.body?.data?.userId).toBeTruthy()
  })

  it('/cooperative/location/:locationId (GET) exists (no 404)', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login/creds')
      .send({ credential: e2eUmufashaEmail, password: e2ePassword })
      .expect(201)

    const token = login.body?.data?.token

    const switched = await request(app.getHttpServer())
      .post('/auth/active-role')
      .set('Authorization', `Bearer ${token}`)
      .send({ activeRole: 'UMUFASHAMYUMVIRE' })
      .expect(201)

    const effectiveToken = switched.body?.data?.token ?? token
    const res = await request(app.getHttpServer())
      .get(`/cooperative/location/${locationId}?type=COOPERATIVE`)
      .set('Authorization', `Bearer ${effectiveToken}`)
      .expect(200)

    expect(Array.isArray(res.body)).toBe(true)
  })

  it('/crop and /animal endpoints exist (no 404)', async () => {
    const login = await request(app.getHttpServer())
      .post('/auth/login/creds')
      .send({ credential: e2eUmufashaEmail, password: e2ePassword })
      .expect(201)

    const token = login.body?.data?.token

    const crops = await request(app.getHttpServer())
      .get('/crop')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(crops.body?.success).toBe(true)

    const animals = await request(app.getHttpServer())
      .get('/animal')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(animals.body?.success).toBe(true)
  })
})
