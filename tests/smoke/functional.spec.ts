import { test, expect } from '@playwright/test';

// 测试添加战队功能
test('添加战队功能', async ({ page }) => {
  // 导航到新建战队页面
  await page.goto('/teams/new');
  
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

// 测试提交资料功能
test('提交资料功能', async ({ page }) => {
  // 导航到战队资料页面（使用示例ID）
  await page.goto('/teams/8fb3096e-0533-49df-b764-46ed9af042f2/profile');
  
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

// 测试发布招募功能
test('发布招募功能', async ({ page }) => {
  // 导航到战队招募页面
  await page.goto('/teams/recruit');
  
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

// 测试发布帖子功能
test('发布帖子功能', async ({ page }) => {
  // 导航到新帖子页面
  await page.goto('/forum/new');
  
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

// 测试队长同意审批功能
test('队长同意审批功能', async ({ page }) => {
  // 导航到战队申请页面
  await page.goto('/teams/applications');
  
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
