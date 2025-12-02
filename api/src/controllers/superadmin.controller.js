// api/src/controllers/superadmin.controller.js
const knex = require('../config/knex');

exports.listMunicipalities = async (req, res) => {
  try {
    const municipalities = await knex('municipalities')
      .select(
        'id',
        'name',
        'email',
        'phone',
        'status',
        'license_end_date',
        'created_at'
      )
      .orderBy('created_at', 'desc');

    return res.json(municipalities);
  } catch (err) {
    console.error('superadmin.listMunicipalities hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

exports.updateMunicipalityStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'pending' | 'active' | 'suspended'

    if (!['pending', 'active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Geçersiz status değeri' });
    }

    const [updated] = await knex('municipalities')
      .where({ id })
      .update({ status, updated_at: knex.fn.now() }, ['*']);

    if (!updated) {
      return res.status(404).json({ message: 'Belediye bulunamadı' });
    }

    return res.json(updated);
  } catch (err) {
    console.error('superadmin.updateMunicipalityStatus hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};
