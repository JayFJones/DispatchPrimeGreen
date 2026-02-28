import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EquipmentCreateSchema, EquipmentUpdateSchema } from '@dispatch/shared/types/equipment';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/authorize.js';
import {
  getEquipmentById,
  listEquipment,
  createEquipment,
  updateEquipment,
  removeEquipment,
  EquipmentServiceError,
} from '../services/equipment-service.js';

const EquipmentIdParamsSchema = z.object({
  id: z.string().uuid(),
});

function handleServiceError(err: unknown, reply: { code: (n: number) => { send: (body: unknown) => unknown } }) {
  if (err instanceof EquipmentServiceError) {
    return reply.code(err.statusCode).send({ error: { code: err.code, message: err.message } });
  }
  throw err;
}

export default async function equipmentRoutes(server: FastifyInstance): Promise<void> {
  // GET /api/equipment — list all equipment
  server.get('/api/equipment', {
    preHandler: [authenticate, requireRole('equipment_manager', 'operations_management', 'system_admin')],
  }, async () => {
    return listEquipment();
  });

  // GET /api/equipment/:id
  server.get('/api/equipment/:id', {
    preHandler: [authenticate, requireRole('equipment_manager', 'operations_management', 'system_admin')],
    schema: {
      params: EquipmentIdParamsSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof EquipmentIdParamsSchema>;
    try {
      return await getEquipmentById(id);
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // POST /api/equipment
  server.post('/api/equipment', {
    preHandler: [authenticate, requireRole('equipment_manager', 'system_admin')],
    schema: {
      body: EquipmentCreateSchema,
    },
  }, async (request, reply) => {
    const data = request.body as z.infer<typeof EquipmentCreateSchema>;
    try {
      const equipment = await createEquipment(data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      reply.code(201);
      return equipment;
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // PATCH /api/equipment/:id
  server.patch('/api/equipment/:id', {
    preHandler: [authenticate, requireRole('equipment_manager', 'system_admin')],
    schema: {
      params: EquipmentIdParamsSchema,
      body: EquipmentUpdateSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof EquipmentIdParamsSchema>;
    const data = request.body as z.infer<typeof EquipmentUpdateSchema>;
    try {
      return await updateEquipment(id, data, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });

  // DELETE /api/equipment/:id
  server.delete('/api/equipment/:id', {
    preHandler: [authenticate, requireRole('equipment_manager', 'system_admin')],
    schema: {
      params: EquipmentIdParamsSchema,
    },
  }, async (request, reply) => {
    const { id } = request.params as z.infer<typeof EquipmentIdParamsSchema>;
    try {
      await removeEquipment(id, request.user.sub, {
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
      });
      return { message: 'Equipment deleted' };
    } catch (err) {
      return handleServiceError(err, reply);
    }
  });
}
