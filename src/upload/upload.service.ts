import { Injectable } from '@nestjs/common';
import { join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

@Injectable()
export class UploadService {
  private readonly uploadPath = join(__dirname, '..', '..', 'uploads');

  constructor() {
    // Ensure upload directory exists
    if (!existsSync(this.uploadPath)) {
      mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  saveFile(file: Express.Multer.File): string {
    // Generate a unique filename by appending a timestamp
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const uniqueFilename = `${timestamp}-${file.originalname}`;

    // Define the path to save the file
    const filePath = join(this.uploadPath, uniqueFilename);

    // Save the file
    writeFileSync(filePath, file.buffer);

    // Return the URL path
    return uniqueFilename; // Return filename only
  }
}
