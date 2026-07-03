import { Router } from 'express';
import { ok, ERR, AppError } from '../utils/response.js';
import { countWords } from '../utils/countWords.js';
import { inspiration, polish } from '../services/ai/index.js';

const router = Router();

/** 风格续写（契约 §5）：服务端取最近 ≤3 封已发信拼 prompt → 3 条候选 */
router.post('/inspiration', async (req, res, next) => {
  try {
    const suggestions = await inspiration(req.uid, {
      draft: req.body?.draft,
      targetUid: req.body?.targetUid,
    });
    res.json(ok({ suggestions }));
  } catch (err) {
    next(err);
  }
});

/** 润色（契约 §5）：text ≥10 字，不足 → 1002 */
router.post('/polish', async (req, res, next) => {
  try {
    const text = String(req.body?.text || '');
    if (countWords(text) < 10) {
      throw new AppError(ERR.WORD_COUNT, '先写下一点内容，再帮你润色');
    }
    res.json(ok({ polished: await polish(req.uid, { text }) }));
  } catch (err) {
    next(err);
  }
});

export default router;
