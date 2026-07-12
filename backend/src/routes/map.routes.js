const express = require('express');
const kakaoMapService = require('../services/kakaoMap.service');
const odsayService = require('../services/odsay.service');
const { authMiddleware, requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/transit', async (req, res, next) => {
  try {
    const { origin, destination, walkPath } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ message: '출발지와 도착지가 필요합니다' });
    }
    if (!odsayService.hasApiKey()) {
      return res.status(503).json({ message: '개발용 ODsay Server 키가 설정되지 않았습니다' });
    }

    const transit = await odsayService.buildTransitRouteMode(origin, destination, walkPath);
    if (!transit) {
      return res.status(404).json({ message: '대중교통 경로를 찾을 수 없습니다' });
    }

    res.json({ transit });
  } catch (error) {
    next(error);
  }
});

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
