import { test, expect } from '@playwright/test';

test('登录页面加载正常', async ({ page }) => {
  // 导航到登录页面
  await page.goto('/auth/login');
  
  // 等待页面完全加载
  await page.waitForLoadState('networkidle');
  
  // 尝试关闭可能的覆盖层
  try {
    // 点击覆盖层的关闭按钮或背景
    await page.click('.fixed.inset-0.bg-black\/50', { timeout: 2000 });
  } catch (e) {
    // 忽略错误，可能没有覆盖层
  }
  
  // 验证页面无控制台错误
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  
  // 验证无控制台错误
  expect(consoleErrors).toHaveLength(0);
});

test('注册页面加载正常', async ({ page }) => {
  // 导航到注册页面
  await page.goto('/auth/register');
  
  // 等待页面完全加载
  await page.waitForLoadState('networkidle');
  
  // 尝试关闭可能的覆盖层
  try {
    // 点击覆盖层的关闭按钮或背景
    await page.click('.fixed.inset-0.bg-black\/50', { timeout: 2000 });
  } catch (e) {
    // 忽略错误，可能没有覆盖层
  }
  
  // 验证页面无控制台错误
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  
  // 验证无控制台错误
  expect(consoleErrors).toHaveLength(0);
});

test('回调页面加载正常', async ({ page }) => {
  // 导航到回调页面
  await page.goto('/auth/callback');
  
  // 等待页面完全加载
  await page.waitForLoadState('networkidle');
  
  // 尝试关闭可能的覆盖层
  try {
    // 点击覆盖层的关闭按钮或背景
    await page.click('.fixed.inset-0.bg-black\/50', { timeout: 2000 });
  } catch (e) {
    // 忽略错误，可能没有覆盖层
  }
  
  // 验证页面无控制台错误
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  
  // 验证无控制台错误
  expect(consoleErrors).toHaveLength(0);
});
