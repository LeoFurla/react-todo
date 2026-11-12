import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyHelmet from '@fastify/helmet';
import { authRoutes } from './routes/auth.js';
import { profileRoutes } from './routes/profile.js';
import { todoRoutes } from './routes/todos.js';
import { tagRoutes } from './routes/tags.js';
import { staticRoutes } from './static.js';

export async function buildApp() {
    const app = Fastify({ logger: { level: 'info' } });
    await app.register(fastifyCookie);
    await app.register(fastifyMultipart, { limits: { fileSize: 5 * 1024 * 1024, files: 1 } });
    // global: false — only routes with a rateLimit config get limited (login, register)
    await app.register(fastifyRateLimit, { global: false });
    // The site is plain HTTP over Tailscale, so helmet must not emit the
    // HTTPS-only directives: upgrade-insecure-requests (CSP) would rewrite
    // every subresource to https:// and silently kill the page, and HSTS
    // would poison the origin for a year.
    await app.register(fastifyHelmet, {
        hsts: false,
        crossOriginOpenerPolicy: false, // warning-only on non-https origins
        originAgentCluster: false,
        contentSecurityPolicy: { directives: { 'upgrade-insecure-requests': null } },
    }); // CSP, X-Content-Type-Options, frame protection, …

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