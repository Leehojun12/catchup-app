const express = require('express');
const aiParserService = require('../services/aiParser.service');
const youtubeService = require('../services/youtube.service');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.use(authMiddleware);

router.post('/place', async (req, res, next) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ message: '키워드를 입력해주세요' });

    const place = await aiParserService.getPlaceInfo(keyword);
    res.json({ place });
  } catch (error) {
    next(error);
  }
});

router.post('/youtube', async (req, res, next) => {
  try {
    const { keyword } = req.body;
    if (!keyword) return res.status(400).json({ message: '키워드를 입력해주세요' });

    const videos = await youtubeService.searchVideos(keyword);
    res.json({ videos });
  } catch (error) {
    next(error);
  }
});

router.post('/checklist', async (req, res, next) => {
  try {
    const { event } = req.body;
    if (!event) return res.status(400).json({ message: '일정 정보가 필요합니다' });

    const items = await aiParserService.generateChecklist(event);
    res.json({ items });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
