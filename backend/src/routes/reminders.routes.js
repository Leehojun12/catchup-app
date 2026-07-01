const express = require('express');
const { authMiddleware, requireAuth } = require('../middleware/auth');
const { syncUserReminders } = require('../store/eventsStore');
const reminderService = require('../services/reminder.service');

const router = express.Router();

router.use(authMiddleware, requireAuth);

// Sync the app's upcoming events so the backend can send Kakao/SMS reminders
// even when the app is closed.
router.post('/sync', (req, res, next) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ message: 'events 배열이 필요합니다' });
    }

    const jobs = syncUserReminders(req.user.id, events);
    res.json({ success: true, count: jobs.length });
  } catch (error) {
    next(error);
  }
});

// Manual test trigger (dev): run the scheduler tick immediately
router.post('/test-tick', async (_req, res, next) => {
  try {
    await reminderService.tick();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
