import { Injectable } from '@nestjs/common'

@Injectable()
export class AppService {
  getHello(): string {
    return '<h1>SURVEY HUB BACKEND APP APIs</h1>'
  }
}
