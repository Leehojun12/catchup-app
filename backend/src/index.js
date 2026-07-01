require('dotenv').config();

const os = require('os');
const express = require('express');
const cors = require('cors');

const config = require('./config/env');
const authRoutes = require('./routes/auth.routes');
const aiRoutes = require('./routes/ai.routes');
const recommendationsRoutes = require('./routes/recommendations.routes');
const remindersRoutes = require('./routes/reminders.routes');
const reminderService = require('./services/reminder.service');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', service: 'catchup-backend' });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/reminders', remindersRoutes);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || '서버 오류가 발생했습니다' });
});

function getLanAddresses() {
  const ips = [];
  for (const interfaces of Object.values(os.networkInterfaces())) {
    for (const net of interfaces || []) {
      if (net.family === 'IPv4' && !net.internal) {
        ips.push(net.address);
      }
    }
  }
  return ips;
}

app.listen(config.port, '0.0.0.0', () => {
  console.log(`CatchUp API running on http://localhost:${config.port}`);
  for (const ip of getLanAddresses()) {
    console.log(`  → phone: http://${ip}:${config.port}/api`);
  }
  reminderService.start();
});
