import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SettingsService {
    constructor(
        private readonly databaseServic : DatabaseService
    ){}

    // get the sms price per message
    async getSmsPrice() : Promise<number> {
       const price = process.env.SINGLE_MESSAGE_AMOUNT 

       if (!price) {
        throw new Error('Sms price not found');
       }

       return Number(price)
    }

    // get the admin creation code 
    async getAdminCreationCode() : Promise<string> {
        const code = process.env.DEV_ADMIN_KEY;

        if (!code) {
            throw new Error('Admin creation code not found');
        }

        return code;
    }
}

