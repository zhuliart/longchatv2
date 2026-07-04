/* 草稿接口（契约 §4 / server routes/drafts.js） */
import { client } from './client.js';

/** 草稿列表（分页） */
export const getDrafts = (page = 0) => client.get(`/drafts?page=${page}`);

/** 保存/更新草稿：带 id 更新、不带新建；{ id?, targetUid?, title, content, isFirst? } */
export const saveDraft = (payload) => client.post('/drafts', payload);

/** 删除草稿 */
export const deleteDraft = (id) => client.del(`/drafts/${id}`);
