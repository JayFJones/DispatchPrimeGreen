import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

// Side-effect import: adds user and terminalId to FastifyRequest type
import './auth/request-context.js';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import terminalRoutes from './routes/terminals.js';
import driverRoutes from './routes/drivers.js';
import vehicleRoutes from './routes/vehicles.js';
import equipmentRoutes from './routes/equipment.js';
import geotabRoutes from './routes/geotab.js';
import routeRoutes from './routes/routes.js';
import dispatchRoutes from './routes/dispatch.js';
import alertRoutes from './routes/alerts.js';
import availabilityRoutes from './routes/availability.js';
import routeSubstitutionRoutes from './routes/route-substitutions.js';
import reportingRoutes from './routes/reporting.js';

const port = Number(process.env['PORT'] ?? 3031);

export async function buildServer() {
  const server = Fastify({ logger: true });

  // Zod schema validation for request/response
  server.setValidatorCompiler(validatorCompiler);
  server.setSerializerCompiler(serializerCompiler);

  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  await server.register(cookie);

  // Decorate request with auth context placeholders.
  // Using undefined as initial value for the JwtPayload getter/setter.
  server.decorateRequest('user', undefined as never);
  server.decorateRequest('terminalId', '');

  // Health check
  server.get('/health', async () => {
    return { status: 'ok' };
  });

  // Routes
  await server.register(authRoutes);
  await server.register(userRoutes);
  await server.register(terminalRoutes);
  await server.register(driverRoutes);
  await server.register(vehicleRoutes);
  await server.register(equipmentRoutes);
  await server.register(geotabRoutes);
  await server.register(routeRoutes);
  await server.register(dispatchRoutes);
  await server.register(alertRoutes);
  await server.register(availabilityRoutes);
  await server.register(routeSubstitutionRoutes);
  await server.register(reportingRoutes);

  return server;
}

// Entry point: only runs when this file is executed directly (not imported)
const isDirectRun =
  process.argv[1]?.endsWith('server.ts') ||
  process.argv[1]?.endsWith('server.js');

if (isDirectRun) {
  buildServer()
    .then((server) => server.listen({ port, host: '0.0.0.0' }))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
