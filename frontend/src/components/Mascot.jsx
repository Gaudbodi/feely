import React from 'react';
import { motion } from 'framer-motion';

const Mascot = ({ size = 150, mood = 'happy', className = '' }) => {
  const animations = {
    happy: {
      scale: [1, 1.05, 1],
      rotate: [0, 2, -2, 0],
    },
    thinking: {
      y: [0, -10, 0],
    },
    error: {
      x: [-5, 5, -5, 5, 0],
    }
  };

  return (
    <motion.div
      className={`mascot-container ${className}`}
      animate={animations[mood] || animations.happy}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        {/* Body - Heart Shape */}
        <motion.path
          d="M100 170C100 170 30 130 30 80C30 50 50 30 75 30C88 30 96 38 100 45C104 38 112 30 125 30C150 30 170 50 170 80C170 130 100 170 100 170Z"
          fill="var(--primary)"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5 }}
        />
        
        {/* Face */}
        <circle cx="75" cy="75" r="8" fill="white" />
        <circle cx="125" cy="75" r="8" fill="white" />
        
        {/* Mouth */}
        {mood === 'happy' && (
          <path d="M80 110C90 120 110 120 120 110" stroke="white" strokeWidth="6" strokeLinecap="round" />
        )}
        {mood === 'error' && (
          <path d="M80 120C90 110 110 110 120 120" stroke="white" strokeWidth="6" strokeLinecap="round" />
        )}
        {mood === 'thinking' && (
          <rect x="80" y="115" width="40" height="4" rx="2" fill="white" />
        )}

        {/* Pulse Line */}
        <motion.path
          d="M40 90H70L80 60L100 120L115 80L125 90H160"
          stroke="white"
          strokeWidth="3"
          strokeOpacity="0.3"
          fill="none"
          animate={{
            pathSpacing: [0, 1, 0],
            opacity: [0.2, 0.5, 0.2]
          }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </svg>
    </motion.div>
  );
};

export default Mascot;
