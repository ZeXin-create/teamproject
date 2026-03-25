// 生成默认头像的 data URI
export const getDefaultAvatar = (size: number = 100) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // 绘制背景
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, size, size);
    
    // 绘制用户图标
    ctx.fillStyle = '#9ca3af';
    ctx.beginPath();
    // 头部圆形
    ctx.arc(size / 2, size / 3, size / 6, 0, Math.PI * 2);
    ctx.fill();
    
    // 身体
    ctx.beginPath();
    ctx.ellipse(size / 2, size * 0.75, size / 3, size / 4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  
  return canvas.toDataURL();
};

// 简单的彩色头像生成（基于用户ID的首字母）
export const getInitialAvatar = (name: string = 'U', size: number = 100) => {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // 生成背景色
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
    const colorIndex = name.charCodeAt(0) % colors.length;
    
    // 绘制背景
    ctx.fillStyle = colors[colorIndex];
    ctx.fillRect(0, 0, size, size);
    
    // 绘制文字
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size / 2}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name.charAt(0).toUpperCase(), size / 2, size / 2);
  }
  
  return canvas.toDataURL();
};