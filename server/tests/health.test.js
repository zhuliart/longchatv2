import test from 'node:test';
import assert from 'node:assert/strict';

// 测试环境变量须在 import config 之前就位
process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/pingchang-test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const { default: request } = await import('supertest');
const { createApp } = await import('../src/app.js');

const app = createApp();

test('GET /api/v1/health → 200 + {code:0}', async () => {
  const res = await request(app).get('/api/v1/health');
  assert.equal(res.status, 200);
  assert.equal(res.body.code, 0);
  assert.equal(res.body.message, 'ok');
  assert.equal(res.body.data.status, 'ok');
  assert.ok(res.body.data.now);
});

test('未知业务路由：无 token 先被鉴权拦下（401 统一响应包）', async () => {
  const res = await request(app).get('/api/v1/no-such-route');
  assert.equal(res.status, 401);
  assert.equal(res.body.code, 9001);
  assert.equal(res.body.data, null);
});

test('API 前缀之外的未知路由 → 404 + {code:9001} 统一响应包', async () => {
  const res = await request(app).get('/no-such-route');
  assert.equal(res.status, 404);
  assert.equal(res.body.code, 9001);
  assert.equal(res.body.data, null);
});

test('非法 JSON 请求体 → 400 + {code:9001}', async () => {
  const res = await request(app)
    .post('/api/v1/health')
    .set('content-type', 'application/json')
    .send('{bad json');
  assert.equal(res.status, 400);
  assert.equal(res.body.code, 9001);
});
