// api/src/controllers/assets.controller.js
const knex = require('../config/knex');

/**
 * GET /api/assets
 * Aktif belediyeye ait tüm varlıkları listeler.
 */
exports.listAssets = async (req, res) => {
  try {
    const { municipality_id } = req.user;

    const assets = await knex('assets as a')
      .leftJoin('asset_categories as c', 'a.category_id', 'c.id')
      .leftJoin('departments as d', 'a.department_id', 'd.id')
      .leftJoin('locations as l', 'a.location_id', 'l.id')
      .where('a.municipality_id', municipality_id)
      .select(
        'a.id',
        'a.asset_code',
        'a.name',
        'a.description',
        'a.asset_type',
        'a.quantity',
        'a.unit',
        'a.tasinir_code',
        'a.serial_number',
        'a.purchase_price',
        'a.purchase_date',
        'a.created_at',
        'a.updated_at',
        'c.id as category_id',
        'c.name as category_name',
        'd.id as department_id',
        'd.name as department_name',
        'l.id as location_id',
        'l.name as location_name'
      )
      .orderBy('a.id', 'asc');

    return res.json(assets);
  } catch (err) {
    console.error('assets.listAssets hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

/**
 * GET /api/assets/:id
 * Sadece aktif belediyeye ait bir varlığı getirir.
 */
exports.getAssetById = async (req, res) => {
  try {
    const { municipality_id } = req.user;
    const { id } = req.params;

    const asset = await knex('assets as a')
      .leftJoin('asset_categories as c', 'a.category_id', 'c.id')
      .leftJoin('departments as d', 'a.department_id', 'd.id')
      .leftJoin('locations as l', 'a.location_id', 'l.id')
      .where('a.id', id)
      .andWhere('a.municipality_id', municipality_id)
      .select(
        'a.id',
        'a.asset_code',
        'a.name',
        'a.description',
        'a.asset_type',
        'a.quantity',
        'a.unit',
        'a.tasinir_code',
        'a.serial_number',
        'a.purchase_price',
        'a.purchase_date',
        'a.created_at',
        'a.updated_at',
        'c.id as category_id',
        'c.name as category_name',
        'd.id as department_id',
        'd.name as department_name',
        'l.id as location_id',
        'l.name as location_name'
      )
      .first();

    if (!asset) {
      return res.status(404).json({ message: 'Varlık bulunamadı' });
    }

    return res.json(asset);
  } catch (err) {
    console.error('assets.getAssetById hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

/**
 * POST /api/assets
 * Yeni varlık oluşturur.
 * Not: municipality_id body'den alınmaz, her zaman JWT'den set edilir.
 */
exports.createAsset = async (req, res) => {
  try {
    const { municipality_id, id: currentUserId } = req.user;

    const {
      asset_code,
      name,
      description,
      category_id,
      department_id,
      location_id,
      assigned_user_id,
      quantity,
      unit,
      tasinir_code,
      asset_type,
      serial_number,
      purchase_price,
      purchase_date,
    } = req.body;

    if (!asset_code || !name || !category_id || !department_id || !location_id) {
      return res.status(400).json({
        message: 'asset_code, name, category_id, department_id ve location_id zorunludur',
      });
    }

    // Aynı belediye içinde asset_code benzersiz olsun
    const existing = await knex('assets')
      .where({
        municipality_id,
        asset_code,
      })
      .first();

    if (existing) {
      return res.status(400).json({ message: 'Bu asset_code bu belediyede zaten kullanılıyor' });
    }

    const [inserted] = await knex('assets')
      .insert({
        asset_code,
        name,
        description: description || null,
        category_id,
        department_id,
        location_id,
        assigned_user_id: assigned_user_id || null,
        quantity: quantity ?? 1,
        unit: unit || 'Adet',
        tasinir_code: tasinir_code || null,
        asset_type: asset_type || 'demirbas',
        serial_number: serial_number || null,
        purchase_price: purchase_price || null,
        purchase_date: purchase_date || null,
        municipality_id,
        created_by_user_id: currentUserId,
      })
      .returning('*');

    return res.status(201).json(inserted);
  } catch (err) {
    console.error('assets.createAsset hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

/**
 * PUT /api/assets/:id
 * Varlığı günceller (sadece kendi belediyesindeki kayıt üzerinde).
 */
exports.updateAsset = async (req, res) => {
  try {
    const { municipality_id } = req.user;
    const { id } = req.params;

    const {
      asset_code,
      name,
      description,
      category_id,
      department_id,
      location_id,
      assigned_user_id,
      quantity,
      unit,
      tasinir_code,
      asset_type,
      serial_number,
      purchase_price,
      purchase_date,
    } = req.body;

    // Önce bu id ilgili belediyeye mi ait kontrol edelim
    const existing = await knex('assets')
      .where({ id, municipality_id })
      .first();

    if (!existing) {
      return res.status(404).json({ message: 'Varlık bulunamadı veya bu belediyeye ait değil' });
    }

    // asset_code değiştiyse aynı belediyede çakışma olmasın
    if (asset_code && asset_code !== existing.asset_code) {
      const conflict = await knex('assets')
        .where({ municipality_id, asset_code })
        .andWhereNot({ id })
        .first();

      if (conflict) {
        return res.status(400).json({ message: 'Bu asset_code bu belediyede zaten kullanılıyor' });
      }
    }

    const [updated] = await knex('assets')
      .where({ id, municipality_id })
      .update(
        {
          asset_code: asset_code ?? existing.asset_code,
          name: name ?? existing.name,
          description: description ?? existing.description,
          category_id: category_id ?? existing.category_id,
          department_id: department_id ?? existing.department_id,
          location_id: location_id ?? existing.location_id,
          assigned_user_id: assigned_user_id ?? existing.assigned_user_id,
          quantity: quantity ?? existing.quantity,
          unit: unit ?? existing.unit,
          tasinir_code: tasinir_code ?? existing.tasinir_code,
          asset_type: asset_type ?? existing.asset_type,
          serial_number: serial_number ?? existing.serial_number,
          purchase_price: purchase_price ?? existing.purchase_price,
          purchase_date: purchase_date ?? existing.purchase_date,
          updated_at: knex.fn.now(),
        },
        ['*']
      );

    return res.json(updated);
  } catch (err) {
    console.error('assets.updateAsset hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};

/**
 * DELETE /api/assets/:id
 * Şimdilik fiziksel silme (ileride soft delete'e çevrilebilir).
 */
exports.deleteAsset = async (req, res) => {
  try {
    const { municipality_id } = req.user;
    const { id } = req.params;

    const deletedCount = await knex('assets')
      .where({ id, municipality_id })
      .del();

    if (deletedCount === 0) {
      return res.status(404).json({ message: 'Varlık bulunamadı veya bu belediyeye ait değil' });
    }

    return res.json({ message: 'Varlık silindi' });
  } catch (err) {
    console.error('assets.deleteAsset hatası:', err);
    return res.status(500).json({ message: 'Sunucu hatası' });
  }
};
