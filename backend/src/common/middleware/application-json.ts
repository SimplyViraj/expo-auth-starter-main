import { json, type RequestHandler } from 'express';

export function applicationJson(): RequestHandler {
  const parseJson = json({ limit: '32kb' });
  const parsePhoto = json({ limit: '384kb' });

  return (req, res, next) => {
    // Better Auth must receive its raw request stream.
    if (req.path === '/api/auth' || req.path.startsWith('/api/auth/')) return next();
    if (req.method === 'PATCH' && req.path === '/api/profile/photo') return parsePhoto(req, res, next);
    return parseJson(req, res, next);
  };
}
