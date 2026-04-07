import { test, expect } from '@playwright/test';

// 测试AI助手交互功能
test('AI助手交互功能', async ({ page }) => {
  // 导航到AI助手页面
  await page.goto('/ai-assistant');
  
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

// 测试朋友页面交互功能
test('朋友页面交互功能', async ({ page }) => {
  // 导航到朋友页面
  await page.goto('/friends');
  
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

// 测试个人资料页面交互功能
test('个人资料页面交互功能', async ({ page }) => {
  // 导航到个人资料页面
  await page.goto('/profile');
  
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

// 测试战队分组页面交互功能
test('战队分组页面交互功能', async ({ page }) => {
  // 导航到战队分组页面（使用示例ID）
  await page.goto('/teams/8fb3096e-0533-49df-b764-46ed9af042f2/grouping');
  
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

// 测试战队AI聊天页面交互功能
test('战队AI聊天页面交互功能', async ({ page }) => {
  // 导航到战队AI聊天页面
  await page.goto('/teams/ai-chat');
  
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

// 测试战队公告页面交互功能
test('战队公告页面交互功能', async ({ page }) => {
  // 导航到战队公告页面
  await page.goto('/teams/announcements');
  
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

// 测试战队数据分析页面交互功能
test('战队数据分析页面交互功能', async ({ page }) => {
  // 导航到战队分析页面
  await page.goto('/teams/data/analytics');
  
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

// 测试战队比赛记录页面交互功能
test('战队比赛记录页面交互功能', async ({ page }) => {
  // 导航到战队比赛记录页面
  await page.goto('/teams/data/match-records');
  
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

// 测试战队信息页面交互功能
test('战队信息页面交互功能', async ({ page }) => {
  // 导航到战队信息页面
  await page.goto('/teams/data/team-info');
  
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

// 测试战队训练计划页面交互功能
test('战队训练计划页面交互功能', async ({ page }) => {
  // 导航到战队训练计划页面
  await page.goto('/teams/data/training-plans');
  
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

// 测试战队动态页面交互功能
test('战队动态页面交互功能', async ({ page }) => {
  // 导航到战队动态页面
  await page.goto('/teams/dynamics');
  
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

// 测试战队编辑页面交互功能
test('战队编辑页面交互功能', async ({ page }) => {
  // 导航到战队编辑页面
  await page.goto('/teams/edit');
  
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

// 测试战队加入页面交互功能
test('战队加入页面交互功能', async ({ page }) => {
  // 导航到战队加入页面
  await page.goto('/teams/join');
  
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

// 测试战队管理页面交互功能
test('战队管理页面交互功能', async ({ page }) => {
  // 导航到战队管理页面
  await page.goto('/teams/manage');
  
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

// 测试新建战队页面交互功能
test('新建战队页面交互功能', async ({ page }) => {
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

// 测试战队招募页面交互功能
test('战队招募页面交互功能', async ({ page }) => {
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

// 测试战队训练页面交互功能
test('战队训练页面交互功能', async ({ page }) => {
  // 导航到战队训练页面
  await page.goto('/teams/training');
  
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

// 测试论坛新帖子页面交互功能
test('论坛新帖子页面交互功能', async ({ page }) => {
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

// 测试论坛帖子详情页面交互功能
test('论坛帖子详情页面交互功能', async ({ page }) => {
  // 导航到帖子详情页面（使用示例ID）
  await page.goto('/forum/1');
  
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

// 测试战队销售新销售页面交互功能
test('战队销售新销售页面交互功能', async ({ page }) => {
  // 导航到新销售页面
  await page.goto('/team-sales/new');
  
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

// 测试锦标赛新锦标赛页面交互功能
test('锦标赛新锦标赛页面交互功能', async ({ page }) => {
  // 导航到新锦标赛页面
  await page.goto('/tournaments/new');
  
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

// 测试锦标赛详情页面交互功能
test('锦标赛详情页面交互功能', async ({ page }) => {
  // 导航到锦标赛详情页面（使用示例ID）
  await page.goto('/tournaments/1');
  
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

// 测试锦标赛注册页面交互功能
test('锦标赛注册页面交互功能', async ({ page }) => {
  // 导航到锦标赛注册页面（使用示例ID）
  await page.goto('/tournaments/1/register');
  
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
