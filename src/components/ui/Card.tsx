import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glass?: boolean;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false, glass = false, onClick }) => {
  const base = 'rounded-2xl border transition-all duration-200';
  const theme = glass
    ? 'bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-white/20 dark:border-zinc-700/50 shadow-xl'
    : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm';
  const hoverClass = hover ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : '';

  if (hover || onClick) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className={`${base} ${theme} ${hoverClass} ${className}`}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={`${base} ${theme} ${className}`}>
      {children}
    </div>
  );
};
