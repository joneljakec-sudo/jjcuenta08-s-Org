import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', variant = 'rectangular' }) => {
  const baseClasses = 'animate-pulse bg-brand-ink/5 dark:bg-white/5';
  const variantClasses = {
    rectangular: 'rounded-2xl',
    circular: 'rounded-full',
    text: 'rounded h-4 w-full',
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} />
  );
};

export const RecipeCardSkeleton = () => (
  <div className="bg-white dark:bg-brand-card rounded-[32px] overflow-hidden border border-black/5 dark:border-white/10 shadow-sm">
    <Skeleton className="w-full aspect-[4/3]" />
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-start">
        <Skeleton variant="text" className="w-2/3 h-6" />
        <Skeleton variant="circular" className="w-8 h-8" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="w-16 h-6 rounded-full" />
        <Skeleton variant="rectangular" className="w-16 h-6 rounded-full" />
      </div>
      <div className="flex justify-between items-center pt-4 border-t border-black/5">
        <Skeleton variant="text" className="w-20" />
        <Skeleton variant="text" className="w-20" />
      </div>
    </div>
  </div>
);

export const FeedItemSkeleton = () => (
  <div className="bg-white dark:bg-brand-card p-6 rounded-[32px] border border-black/5 dark:border-white/10 shadow-sm space-y-4">
    <div className="flex items-center gap-4">
      <Skeleton variant="circular" className="w-12 h-12" />
      <div className="space-y-2 flex-1">
        <Skeleton variant="text" className="w-1/3" />
        <Skeleton variant="text" className="w-1/4" />
      </div>
    </div>
    <Skeleton variant="text" className="w-full h-20" />
    <Skeleton className="w-full aspect-video rounded-2xl" />
  </div>
);
