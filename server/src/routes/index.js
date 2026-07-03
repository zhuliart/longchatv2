import { Router } from 'express';
import healthRouter from './health.js';
import authRouter from './auth.js';
import usersRouter from './users.js';
import lettersRouter from './letters.js';
import draftsRouter from './drafts.js';
import moodsRouter from './moods.js';
import plazaRouter from './plaza.js';
import matchesRouter from './matches.js';
import aiRouter from './ai.js';
import { requireAuth, requireProfile } from '../middlewares/auth.js';

/**
 * /api/v1 路由总装：health 与 /auth/* 公开；
 * 其余一律先过 JWT 鉴权（T2.4）再过引导门槛（T2.5）。
 * M3 新增业务路由时挂在 requireProfile 之后即可自动受保护。
 */
const api = Router();

api.use('/health', healthRouter);
api.use('/auth', authRouter);

api.use(requireAuth);
api.use(requireProfile);

api.use('/users', usersRouter);
api.use('/letters', lettersRouter);
api.use('/drafts', draftsRouter);
api.use('/moods', moodsRouter);
api.use('/plaza', plazaRouter);
api.use('/matches', matchesRouter);
api.use('/ai', aiRouter);

export default api;
