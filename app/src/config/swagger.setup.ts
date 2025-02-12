import { DocumentBuilder } from '@nestjs/swagger';

export default () => {
  return new DocumentBuilder()
    .setTitle('Omenium')
    .setDescription('The API for Omenium')
    .setVersion('0.0.1')
    .addBearerAuth({
      type: 'http',
      in: 'docs',
      name: 'Authorization',
      bearerFormat: 'jwt',
    })
    .addTag('Prediction Market')
    .build();
};
