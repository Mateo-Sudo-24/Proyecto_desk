import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export function requireRoles(allowedRoles) {
  return async (req, res, next) => {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    const user = await prisma.user.findUnique({
      where: { UserId: userId },
      include: { userRoles: { include: { role: true } } }
    });

    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const roles = user.userRoles.map(ur => ur.role.Name);
    const hasAccess = roles.some(role => allowedRoles.includes(role));

    if (!hasAccess) return res.status(403).json({ error: 'Acceso denegado' });
    next();
  };
}
