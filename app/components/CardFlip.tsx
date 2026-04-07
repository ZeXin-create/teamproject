'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface CardFlipProps {
  front: React.ReactNode;
  back: React.ReactNode;
  className?: string;
}

export default function CardFlip({ front, back, className = '' }: CardFlipProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div
      className={`relative w-full h-full cursor-pointer ${className}`}
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <motion.div
        className="relative w-full h-full perspective-1000"
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      >
        <div className="absolute w-full h-full backface-hidden">
          {front}
        </div>
        <motion.div
          className="absolute w-full h-full backface-hidden rotate-180"
          initial={{ rotateY: -180 }}
          animate={{ rotateY: isFlipped ? 0 : -180 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {back}
        </motion.div>
      </motion.div>
    </div>
  );
}