import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface UserMenuProps {
  showUserMenu: boolean;
  userProfile: {
    nickname: string;
    avatar: string;
  };
  setShowUserMenu: (show: boolean) => void;
  setShowLogoutConfirm: (show: boolean) => void;
}

export default function UserMenu({ 
  showUserMenu, 
  userProfile, 
  setShowUserMenu, 
  setShowLogoutConfirm 
}: UserMenuProps) {
  const handleLogout = () => {
    setShowUserMenu(false);
    setShowLogoutConfirm(true);
  };

  if (!showUserMenu) return null;

  return (
    <div className="absolute top-full right-0 mt-2 w-64 card shadow-lg z-50">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
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
          <div>
            <div className="font-semibold text-gray-800">{userProfile.nickname}</div>
          </div>
        </div>
      </div>
      <div className="py-2">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setShowUserMenu(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          个人资料
        </Link>
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
          onClick={() => setShowUserMenu(false)}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          账号设置
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-gray-50 transition-colors text-left"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          退出登录
        </button>
      </div>
    </div>
  );
}
