import React from 'react';
import { motion, useScroll, useSpring } from 'motion/react';

/**
 * Critically damped spring preset inspired by Apple Fluid Interfaces
 * and Emil Kowalski's animations.dev guidelines: snappy, zero cartoonish bounce.
 */
export const FLUID_SPRING = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
  mass: 0.8,
};

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  yOffset?: number;
  className?: string;
}

/**
 * GPU-composited scroll-triggered reveal.
 * Uses `viewport={{ once: true, amount: 0.12 }}` so IntersectionObserver
 * disconnects after the first reveal for zero ongoing scroll overhead.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  delay = 0,
  yOffset = 16,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{
        duration: 0.36,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/**
 * Zero-re-render scroll progress hairline using MotionValue + useSpring
 * directly on the GPU compositor (`scaleX`).
 */
export const ScrollProgressBar: React.FC = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 320,
    damping: 36,
    restDelta: 0.001,
  });

  return (
    <motion.div
      aria-hidden="true"
      className="h-[2px] w-full bg-blue-500/80 origin-left pointer-events-none"
      style={{ scaleX }}
    />
  );
};
