import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { getConfig } from "@playmate/config";

async function bootstrap() {
  const config = getConfig();

  const app = await NestFactory.create(AppModule, { cors: true });

  app.setGlobalPrefix("api");

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  if (config.NODE_ENV !== "production") {
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Playmate API")
      .setDescription("Sports Platform API - Play & Shop")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup("docs", app, document);
  }

  await app.listen(config.API_PORT);
  console.log(`[API] Running on http://localhost:${config.API_PORT}`);
  console.log(`[API] Docs available at http://localhost:${config.API_PORT}/docs`);
}

bootstrap();
