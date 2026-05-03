import React, { useRef, useState } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence } from 'motion/react';
import { Trash2 } from 'lucide-react';

interface SwipeableProps {
  children: React.ReactNode;
  onDelete: () => void;
  confirmMessage?: string;
}

export default function Swipeable({ children, onDelete, confirmMessage }: SwipeableProps) {
  const x = useMotionValue(0);
  const background = useTransform(
    x,
    [-100, 0],
    ['rgba(239, 68, 68, 1)', 'rgba(239, 68, 68, 0)']
  );
  const opacity = useTransform(x, [-100, -50], [1, 0]);
  const scale = useTransform(x, [-100, -50], [1, 0.8]);
  
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -100) {
      if (confirmMessage) {
        if (window.confirm(confirmMessage)) {
          setIsDeleting(true);
          setTimeout(onDelete, 200);
        } else {
          x.set(0);
        }
      } else {
        setIsDeleting(true);
        setTimeout(onDelete, 200);
      }
    } else {
      x.set(0);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[32px]">
      <AnimatePresence>
        {!isDeleting && (
          <>
            {/* Trash Background */}
            <motion.div
              style={{ background }}
              className="absolute inset-0 flex items-center justify-end pr-8"
            >
              <motion.div style={{ opacity, scale }}>
                <Trash2 className="text-white" size={24} />
              </motion.div>
            </motion.div>

            {/* Content */}
            <motion.div
              drag="x"
              dragConstraints={{ left: -120, right: 0 }}
              style={{ x }}
              onDragEnd={handleDragEnd}
              className="relative z-10"
            >
              {children}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
