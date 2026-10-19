const express = require('express');
const { requireAdmin, requirePermission } = require('../middleware/adminAuth');
const { ActivityLog } = require('../models/ActivityLog');

const router = express.Router();

router.use(requireAdmin);
router.use(requirePermission('tasks', 'read'));

router.get('/', async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), 50);
  const q = String(req.query.q || '').trim();
  const filter = {};
  if (q) {
    filter.$or = [
      { actorName: new RegExp(q, 'i') },
      { actorEmail: new RegExp(q, 'i') },
      { taskTitle: new RegExp(q, 'i') },
      { message: new RegExp(q, 'i') },
      { action: new RegExp(q, 'i') },
    ];
  }

  const total = await ActivityLog.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const safePage = Math.min(page, totalPages);
  const skip = (safePage - 1) * limit;

  const items = await ActivityLog.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  res.json({
    items,
    page: safePage,
    limit,
    total,
    totalPages,
  });
});

module.exports = router;
