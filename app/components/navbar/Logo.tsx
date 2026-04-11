import React from 'react';
import Link from 'next/link';

export default function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2">
      <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-accent-500 to-secondary-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
        ✨
      </div>
      <span className="text-2xl font-bold gradient-text md:block hidden">
        王者战队助手系统
      </span>
      <span className="text-xl font-bold gradient-text block md:hidden">
        战队助手
      </span>
    </Link>
  );
}
