import Fastify from 'fastify';
import cors from '@fastify/cors';

const port = Number(process.env['PORT'] ?? 3031);

export async function buildServer() {
  const server = Fastify({ logger: true });

  await server.register(cors, {
    origin: true,
    credentials: true,
  });

  server.get('/health', async () => {
    return { status: 'ok' };
  });

  return server;
}

async function start() {
  const server = await buildServer();

  await server.listen({ port, host: '0.0.0.0' });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
