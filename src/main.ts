import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS for all origins
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Middleware: normalize location-related request fields to lowercase before handlers
  app.use((req: any, _res: any, next: any) => {
    try {
      const lc = (v: any) => (v === undefined || v === null ? v : String(v).trim().toLowerCase());

      // Normalize query params commonly used for locations
      if (req.query) {
        if (req.query.city) req.query.city = lc(req.query.city);
        if (req.query.preset_location_id) req.query.preset_location_id = lc(req.query.preset_location_id);
        if (req.query.preset_location_name) req.query.preset_location_name = lc(req.query.preset_location_name);
        if (req.query.place) req.query.place = lc(req.query.place);
        // generic: if any key endsWith city or contains preset_location, lowercase it
        Object.keys(req.query).forEach((k) => {
          if (/city$/i.test(k) || /preset_location/i.test(k)) req.query[k] = lc(req.query[k]);
        });
      }

      // Normalize body.location and similar nested objects
      if (req.body && typeof req.body === 'object') {
        const b = req.body as any;
        if (b.location && typeof b.location === 'object') {
          if (b.location.city) b.location.city = lc(b.location.city);
          if (b.location.preset_location_id) b.location.preset_location_id = lc(b.location.preset_location_id);
          if (b.location.preset_location_name) b.location.preset_location_name = lc(b.location.preset_location_name);
        }
        // also check top-level fields
        if (b.city) b.city = lc(b.city);
        if (b.preset_location_id) b.preset_location_id = lc(b.preset_location_id);
        if (b.preset_location_name) b.preset_location_name = lc(b.preset_location_name);
      }
    } catch (e) {
      // don't block request on normalization errors
    }
    return next();
  });

  // Global prefix
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`🚀 Application is running on: http://localhost:${port}/api/v1`);
}

bootstrap();
