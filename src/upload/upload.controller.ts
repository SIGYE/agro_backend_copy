import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { join } from 'path';
import { existsSync } from 'fs';
import { AuthGuard } from 'src/guards/auth.guard';
import { Allow } from 'src/decorators/allow.decorator';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Uploads')
@Controller('files')
export class UploadController {
  private readonly uploadPath = join(__dirname, '..', '..', 'uploads');

  @Allow()
  @Get(':filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join(this.uploadPath, filename);
    
    // Check if the file exists
    if (!existsSync(filePath)) {
      return res.status(404).send('File not found');
    }

    // Serve the file
    res.sendFile(filePath);
  }
}
