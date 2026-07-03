import { Router } from 'express';
import { ok } from '../utils/response.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/', (req, res) => {
  res.json(
    ok({
      status: 'ok',
      env: config.env,
      now: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
    })
  );
});

export default router;
