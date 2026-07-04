/* AI 灵感接口（契约 §5 / server routes/ai.js）。替换原型的 window.claude */
import { client } from './client.js';

/** 风格续写：{ draft?, targetUid? } → { suggestions: string[] } */
export const getWritingInspiration = (payload) => client.post('/ai/inspiration', payload);

/** 润色（text ≥10 字，不足 → 1002）：{ text } → { polished } */
export const polishLetter = (text) => client.post('/ai/polish', { text });
