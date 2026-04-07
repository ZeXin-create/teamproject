'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'accent' | 'white';
  text?: string;
}

export default function LoadingSpinner({
  size = 'medium',
  color = 'primary',
  text,
}: LoadingSpinnerProps) {
  const sizeMap = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
  };

  const colorMap = {
    primary: 'border-primary-500',
    accent: 'border-accent-500',
    white: 'border-white',
  };

  return (
    <div className="flex flex-col items-center justify-center">
      <motion.div
        className={`${sizeMap[size]} border-4 border-t-transparent rounded-full ${colorMap[color]}`}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
      {text && (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">
          {text}
        </p>
      )}
    </div>
  );
}