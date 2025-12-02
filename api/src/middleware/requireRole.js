// api/src/middleware/requireRole.js

/**
 * requiredRoles:
 *  - Tek bir rol id'si verilebilir: requireRole(1)
 *  - Veya bir dizi halinde: requireRole([1, 2, 3])
 */
module.exports = function (requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Oturum bulunamadı' });
    }

    const userRoleId = req.user.role_id;

    // Tek değer verilmişse diziye çevir
    const roles = Array.isArray(requiredRoles)
      ? requiredRoles
      : [requiredRoles];

    // Eğer kullanıcı rolü listede yoksa yetkisiz
    if (!roles.includes(userRoleId)) {
      return res.status(403).json({ message: 'Bu işlem için yetkiniz yok' });
    }

    return next();
  };
};
