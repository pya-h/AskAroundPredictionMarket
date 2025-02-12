import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from './config/config.service';
import cookieSession = require('cookie-session');
import swaggerSetup from './config/swagger.setup';
import { SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    cookieSession({
      keys: [new ConfigService().get('COOKIE_KEY')],
    }),
  );
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
  const swaggerConfig = swaggerSetup();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);
  await app.listen(3000);
}
bootstrap();
