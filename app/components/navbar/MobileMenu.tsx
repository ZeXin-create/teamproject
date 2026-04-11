import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface User {
  id: string;
  email: string;
}

interface MobileMenuProps {
  showMobileMenu: boolean;
  user: User | null;
  userProfile: {
    nickname: string;
    avatar: string;
  };
  setShowMobileMenu: (show: boolean) => void;
  setShowLogoutConfirm: (show: boolean) => void;
}

export default function MobileMenu({ 
  showMobileMenu, 
  user, 
  userProfile, 
  setShowMobileMenu, 
  setShowLogoutConfirm 
}: MobileMenuProps) {
  if (!showMobileMenu) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="relative bg-white rounded-2xl w-11/12 max-w-md p-6 shadow-2xl">
        <button
          onClick={() => setShowMobileMenu(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col gap-4">
          <div className="py-4 border-b border-gray-100">
            <Link href="/" className="block p-3 rounded-xl text-gray-800 font-medium">
              🏠 主页
            </Link>
          </div>

          {user ? (
            <>
              <Link
                href="/teams/space"
                className="p-3 rounded-xl text-gray-800 font-medium hover:bg-gray-50"
                onClick={() => setShowMobileMenu(false)}
              >
                🎮 战队管理后台
              </Link>
              <Link
                href="/profile"
                className="p-3 rounded-xl text-gray-800 font-medium hover:bg-gray-50"
                onClick={() => setShowMobileMenu(false)}
              >
                👤 个人中心
              </Link>
              <div className="py-4 border-t border-gray-100">
                <div className="flex items-center gap-3 mb-4">
                  {userProfile.avatar ? (
                    <div className="w-10 h-10 rounded-full overflow-hidden relative">
                      <Image
                        src={userProfile.avatar}
                        alt="用户头像"
                        width={40}
                        height={40}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg"
                      style={{ background: 'linear-gradient(135deg, #ff6b9d, #c44569)' }}
                    >
                      {userProfile.nickname.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-gray-800">{userProfile.nickname}</span>
                </div>
                <button
                  onClick={() => {
                    setShowMobileMenu(false);
                    setShowLogoutConfirm(true);
                  }}
                  className="w-full p-3 rounded-xl text-red-600 font-medium hover:bg-gray-50"
                >
                  退出登录
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                href="/forum"
                className="p-3 rounded-xl text-gray-800 font-medium hover:bg-gray-50"
                onClick={() => setShowMobileMenu(false)}
              >
                📝 社区
              </Link>
              <Link
                href="/team-sales"
                className="p-3 rounded-xl text-gray-800 font-medium hover:bg-gray-50"
                onClick={() => setShowMobileMenu(false)}
              >
                💰 交易
              </Link>
              <div className="flex flex-col gap-3 py-4 border-t border-gray-100">
                <Link
                  href="/auth/login"
                  className="p-3 rounded-xl text-gray-800 font-medium hover:bg-gray-50 text-center"
                  onClick={() => setShowMobileMenu(false)}
                >
                  登录
                </Link>
                <Link
                  href="/auth/register"
                  className="p-3 rounded-xl bg-gradient-to-r from-accent-500 to-secondary-500 text-white font-medium text-center"
                  onClick={() => setShowMobileMenu(false)}
                >
                  注册
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
