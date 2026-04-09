'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import NProgress from 'nprogress';
import 'nprogress/nprogress.css';

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);

    // 检查是否是首次访问
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
      // 标记为已访问
      localStorage.setItem('hasVisited', 'true');
    }

    // 注册Service Worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker 注册成功:', registration.scope);
        })
        .catch((error) => {
          console.log('Service Worker 注册失败:', error);
        });
    }
  }, []);

  // 监听路由变化，显示进度条
  useEffect(() => {
    NProgress.start();
    return () => {
      NProgress.done();
    };
  }, [pathname]);

  // 防止 hydration 不匹配，首次渲染返回空
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
