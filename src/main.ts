import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { BadRequestException, ValidationPipe } from '@nestjs/common'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { ValidationError } from 'class-validator'
import { AppExceptionFilter } from './filter/exception.filter'
import { WinstonModule } from 'nest-winston'
import { winstonLoggerConfig } from './logs/winston-logger.config'


async function bootstrap() {

  // Handle uncaught exceptions
  process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Handle or log the error as necessary
    // Optionally, you can add custom logic here, like shutting down the app gracefully
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    // Handle or log the rejection as necessary
    // Optionally, you can add custom logic here, like shutting down the app gracefully
  });


  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonLoggerConfig)
  })

  // enable cors 
  app.enableCors()

  app.useGlobalFilters(new AppExceptionFilter());

  app.useGlobalPipes(new ValidationPipe(
    {
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        // Extracting and formatting error messages
        const messages = errors.map((error) => {
          // Check if there are constraints in the error
          if (error.constraints) {
            // Join all the constraints messages into a single string
            return Object.values(error.constraints).join(', ');
          }
          // If no constraints, return a generic message
          return `${error.property} has an invalid value`;
        });

        return new BadRequestException(messages)
      }
    }
  ))


  const config = new DocumentBuilder()
    .setTitle('AGRICULTURE APP BACKEND APIS')
    .setDescription('The agriculture backend app apis')
    .setVersion('1.0')
    .addTag('Users')
    .addTag('Uploads')
    .addTag('Settings')
    .addTag('Location')
    .addTag('Auth')
    .addTag('Animal')
    .addTag('Crop')
    .addTag('Farmer')
    .addTag('Breed')
    .addTag('Cooperative')
    .addTag('LivestockRegistration')
    .addTag('SlaughterHouse')
    .addTag('Fertiliser')
    .addTag('Disease')
    .addTag('Pests')
    .addTag('Seasons')
    .addTag('Produce')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
    },
  });
  await app.listen(process.env.PORT || 8000, () => {
    console.log(`Application is running on: ${process.env.PORT || 8000}`)
  })
}
bootstrap()
