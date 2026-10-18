import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';
import { todoRoutes } from './routes/todos.js';
import { tagRoutes } from './routes/tags.js';
import { staticRoutes } from './static.js';

export async function buildApp() {
    const app = Fastify({ logger: { level: 'info' } });
    await app.register(fastifyCookie);
    await app.register(fastifyMultipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });

    app.setErrorHandler((err, request, reply) => {
        const status = err.statusCode || 500;
        if (status >= 500) {
            request.log.error(err);
            return reply.code(500).send({ error: 'server error' }); // don't leak internals
        }
        return reply.code(status).send({ error: err.message || 'bad request' });
    });

    await app.register(authRoutes);
    await app.register(todoRoutes);
    await app.register(tagRoutes);
    await app.register(profileRoutes);
    await app.register(staticRoutes); // catch-all — keep last for readability

    return app;
}