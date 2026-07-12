const express = require('express');
const kakaoMapService = require('../services/kakaoMap.service');
const { authMiddleware, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);
router.use(requireAuth);

router.post('/route', async (req, res, next) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ message: '출발지와 도착지가 필요합니다' });
    }

    const route = await kakaoMapService.getRouteInfo({ origin, destination });
    res.json({ route });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
