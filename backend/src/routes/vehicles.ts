import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { VehicleCreateSchema, VehicleUpdateSchema } from '@dispatch/shared/types/vehicle';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import { requireTerminalScope } from '../middleware/terminal-scope.js';
import {
  getVehicleById,
  listVehiclesByTerminal,
  createVehicle,
  updateVehicle,
  assignVehicleToTerminal,
  removeVehicleFromTerminal,
  VehicleServiceError,
} from '../services/vehicle-service.js';

const VehicleIdParamsSchema = z.object({
  id: z.string().uuid(),
});

const TerminalIdParamsSchema = z.object({
  terminalId: z.string().uuid(),
});

const TerminalVehicleParamsSchema = z.object({
  terminalId: z.string().uuid(),
  vehicleId: z.string().uuid(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof VehicleServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function vehicleRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/terminals/:terminalId/vehicles — list vehicles for a terminal
  server.get('/api/terminals/:terminalId/vehicles', {
    preHandler: [authenticate, requireTerminalScope],
    schema: {
      params: TerminalIdParamsSchema,
    },
  }, async (request) => {
    return listVehiclesByTerminal(request.terminalId);
  });

  // GET /api/vehicles/:id — get vehicle by ID
  server.get('/api/vehicles/:id', {
    preHandler: [authenticate],
    schema: {
      params: VehicleIdParamsSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof VehicleIdParamsSchema>;
    try {
      return await getVehicleById(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/vehicles — create a vehicle (global)
  server.post('/api/vehicles', {
    preHandler: [authenticate, requireRole('terminal_manager', 'equipment_manager', 'system_admin')],
    schema: {
      body: VehicleCreateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof VehicleCreateSchema>;
    try {
      const vehicle = await createVehicle(data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      reply.code(201);
      return vehicle;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/vehicles/:id — update a vehicle
  server.patch('/api/vehicles/:id', {
    preHandler: [authenticate, requireRole('terminal_manager', 'equipment_manager', 'system_admin')],
    schema: {
      params: VehicleIdParamsSchema,
      body: VehicleUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof VehicleIdParamsSchema>;
    const data = request.body as z.infer<typeof VehicleUpdateSchema>;
    try {
      return await updateVehicle(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/terminals/:terminalId/vehicles/:vehicleId — assign vehicle to terminal
  server.post('/api/terminals/:terminalId/vehicles/:vehicleId', {
    preHandler: [authenticate, requireRole('terminal_manager', 'equipment_manager', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalVehicleParamsSchema,
    },
  }, async (request, reply) => {
    const { terminalId, vehicleId } = request.params as z.infer<typeof TerminalVehicleParamsSchema>;
    try {
      await assignVehicleToTerminal(terminalId, vehicleId, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Vehicle assigned to terminal' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/terminals/:terminalId/vehicles/:vehicleId — remove vehicle from terminal
  server.delete('/api/terminals/:terminalId/vehicles/:vehicleId', {
    preHandler: [authenticate, requireRole('terminal_manager', 'equipment_manager', 'system_admin'), requireTerminalScope],
    schema: {
      params: TerminalVehicleParamsSchema,
    },
  }, async (request, reply) => {
    const { terminalId, vehicleId } = request.params as z.infer<typeof TerminalVehicleParamsSchema>;
    try {
      await removeVehicleFromTerminal(terminalId, vehicleId, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Vehicle removed from terminal' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
