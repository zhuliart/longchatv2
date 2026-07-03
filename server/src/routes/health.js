import { Router } from 'express';
import { ok } from '../utils/response.js';
import { config } from '../config/index.js';
import { mongoState } from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(
    ok({
      status: 'ok',
      env: config.env,
      db: mongoState(),
      now: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    })
  );
});

export default router;
