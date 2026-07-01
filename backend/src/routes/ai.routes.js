const express = require('express');
const multer = require('multer');
const aiParserService = require('../services/aiParser.service');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(authMiddleware);

router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).json({ message: '녹음 파일이 없습니다. 다시 녹음해주세요.' });
    }

    const text = await aiParserService.transcribeAudio(req.file.buffer, req.file.mimetype);
    if (!text) {
      return res.status(422).json({ message: '음성을 인식하지 못했습니다. 다시 말씀해주세요.' });
    }

    res.json({ text });
  } catch (error) {
    next(error);
  }
});

router.post('/parse', async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: '분석할 텍스트를 입력해주세요' });
    }

    const result = await aiParserService.parseChatText(text);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/chat', async (req, res, next) => {
  try {
    const { messages, context } = req.body;
    if (!Array.isArray(messages)) {
      return res.status(400).json({ message: '대화 내용이 올바르지 않습니다' });
    }

    const result = await aiParserService.chatWithAi(messages, context);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
