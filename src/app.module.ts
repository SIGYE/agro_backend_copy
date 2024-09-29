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
import { OrganisationModule } from './organisation/organisation.module';
import { LocationService } from './location/location.service';
import { SurveyModule } from './survey/survey.module';
import { OrganisationSurveyorModule } from './organisation-surveyor/organisation-surveyor.module';
import { TeamModule } from './team/team.module';
import { MessagesModule } from './messages/messages.module';
import { CommentModule } from './comment/comment.module';
import { QuestionnaireModule } from './questionnaire/questionnaire.module';
import { ResponseModule } from './response/response.module';
import { DemoRequestModule } from './demo-request/demo-request.module';
import { UploadModule } from './upload/upload.module';
import { ExternalSupportModule } from './external-support/external-support.module';
import { InternalSupportModule } from './internal-support/internal-support.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [ConfigModule.forRoot(), DatabaseModule, MailModule ,   AuthModule, RolesModule , UsersModule, LocationModule, MailModule, OrganisationModule, SurveyModule, OrganisationSurveyorModule, TeamModule, MessagesModule, CommentModule, QuestionnaireModule, ResponseModule, DemoRequestModule, UploadModule, ExternalSupportModule, InternalSupportModule, AnalyticsModule, SettingsModule],
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
export class AppModule implements OnModuleInit{
  constructor(
    private readonly roleService : RolesService,
    private readonly locationService : LocationService
  ){}

  seedData = false


  async onModuleInit() {
      if(this.seedData){
     // data seeding before the application begins 
     this.roleService.initiateRoles()
     this.locationService.seedLocationLevel()
     this.locationService.seedLocationsProvinces()
     this.locationService.seedLocationDistricts()
     this.locationService.seedLocationSectors()
      }
  }
 }
