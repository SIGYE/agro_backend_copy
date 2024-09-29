import { Controller, Get } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { Roles } from 'src/decorators/roles.decorator';
import { Role_Enum } from 'src/enums/role.enum';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Settings')
@Controller('settings')
export class SettingsController {
    constructor(
        private readonly settingsService : SettingsService
    ){}

    // get the sms price per message
    @Roles(Role_Enum.DEV_ACCESS)
    @Get('sms-price')

    async getSmsPrice() : Promise<number> {
        return await this.settingsService.getSmsPrice();
    }

    // get the admin creation code
    @Roles(Role_Enum.DEV_ACCESS)
    @Get('admin-creation-code')
    async getAdminCreationCode() : Promise<string> {
        return await this.settingsService.getAdminCreationCode();
    }
}
