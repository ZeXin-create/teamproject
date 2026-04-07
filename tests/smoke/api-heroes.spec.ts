import { test, expect } from '@playwright/test';

test('英雄API返回成功', async ({ request }) => {
  // 发送GET请求到英雄API
  const response = await request.get('/api/heroes');
  
  // 验证响应状态码为200
  expect(response.status()).toBe(200);
  
  // 验证响应内容是JSON格式
  const data = await response.json();
  expect(Array.isArray(data)).toBe(true);
  
  // 验证响应数据包含英雄信息
  if (data.length > 0) {
    const hero = data[0];
    expect(hero).toHaveProperty('id');
    expect(hero).toHaveProperty('name');
    expect(hero).toHaveProperty('position');
  }
});
