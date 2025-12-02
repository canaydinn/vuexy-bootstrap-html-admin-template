// api/src/middlewares/authorizeRole.js

module.exports = (...allowedRoles) => {
  return (req, res, next) => {
    const { user } = req;
    if (!user || !allowedRoles.includes(user.role)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }
    next();
  };
};
