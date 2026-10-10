import "reflect-metadata";
import * as fs from "fs";
import * as path from "path";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { ZodValidationPipe, patchNestJsSwagger } from "nestjs-zod";
import { apiReference } from "@scalar/nestjs-api-reference";
import { AppModule } from "./app.module";
import { getConfig } from "@playmate/config";

function loadEnv() {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../../.env"),
    path.resolve(__dirname, "../../../.env"),
  ];
  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIdx = trimmed.indexOf("=");
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) {
            process.env[key] = val;
          }
        }
      }
      break;
    }
  }
}

loadEnv();

async function bootstrap() {
  const config = getConfig();

  const app = await NestFactory.create(AppModule, { cors: true });

  app.useGlobalPipes(new ZodValidationPipe());

  if (config.NODE_ENV !== "production") {
    patchNestJsSwagger();
    const swaggerConfig = new DocumentBuilder()
      .setTitle("Playmate API")
      .setDescription("Sports Platform API - Play & Shop")
      .setVersion("0.1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, swaggerConfig);

    // Serve raw OpenAPI JSON
    app.getHttpAdapter().get("/openapi.json", (_req: any, res: any) => {
      res.json(document);
    });

    // Scalar API Reference UI
    const scalarDocs = apiReference({
      content: document,
      theme: "purple",
      darkMode: true,
      metaData: {
        title: "Playmate API Documentation",
        description: "Sports Platform API - Play & Shop",
      },
    });

    app.use("/docs", scalarDocs);
    app.use("/reference", scalarDocs);
  }

  // Redirect root GET / to /docs
  app.getHttpAdapter().get("/", (_req: any, res: any) => {
    res.redirect("/docs");
  });

  await app.listen(config.API_PORT, "0.0.0.0");
  console.log(`[API] Running on http://localhost:${config.API_PORT}`);
  console.log(`[API] Docs available at http://localhost:${config.API_PORT}/docs`);
}

bootstrap();
