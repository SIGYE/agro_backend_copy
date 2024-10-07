import { Module, OnModuleInit } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { RolesModule } from './roles/roles.module';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './guards/roles.guard';
import { AuthGuard } from './guards/auth.guard';
import { AppExceptionFilter } from './filter/exception.filter';
import { UsersModule } from './users/users.module';
import { RolesService } from './roles/roles.service';
import { LocationModule } from './location/location.module';
import { MailModule } from './mail/mail.module';
import { LocationService } from './location/location.service';
import { UploadModule } from './upload/upload.module';
import { SettingsModule } from './settings/settings.module';
import { BreedModule } from './breed/breed.module';
import { LiveStockRegistrationModule } from './live-stock-registration/live-stock-registration.module';
import { CooperativeModule } from './cooperative/cooperative.module';
import { SlaughterHouseModule } from './slaughter-house/slaughter-house.module';
import { CropModule } from './crop/crop.module';
import { AnimalModule } from './animal/animal.module';
import { FarmerModule } from './farmer/farmer.module';
import { AnalyticsModule } from './analytics/analytics.module';


@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule, MailModule, AuthModule, RolesModule, UsersModule, LocationModule, MailModule, UploadModule, SettingsModule, BreedModule, LiveStockRegistrationModule, CooperativeModule, SlaughterHouseModule, CropModule, AnimalModule, FarmerModule, AnalyticsModule],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: AuthGuard,
  }, {
      provide: APP_GUARD,
      useClass: RolesGuard
    }, {
      provide: APP_FILTER,
      useClass: AppExceptionFilter
    }],
})
export class AppModule implements OnModuleInit {
  constructor(
    private readonly roleService: RolesService,
    private readonly locationService: LocationService
  ) { }

  seedData = false



  async onModuleInit() {
    if (this.seedData) {
      // data seeding before the application begins 
      this.roleService.initiateRoles()
      this.locationService.seedLocationLevel()
      this.locationService.seedLocationsProvinces()
      this.locationService.seedLocationDistricts()
      this.locationService.seedLocationSectors()
    }
  }
}
