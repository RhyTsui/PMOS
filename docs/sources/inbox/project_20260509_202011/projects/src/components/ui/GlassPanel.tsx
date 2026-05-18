'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface GlassPanelProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'strong' | 'header' | 'content';
  glow?: boolean;
  title?: string;
  icon?: LucideIcon;
}

export function GlassPanel({
  children,
  className,
  variant = 'default',
  glow = false,
  title,
  icon: Icon,
}: GlassPanelProps) {
  const variants = {
    default: 'glass',
    strong: 'glass-strong',
    header: 'glass border-b border-[var(--aifs-border)]',
    content: 'glass rounded-xl',
  };

  return (
    <div
      className={cn(
        variants[variant],
        glow && 'glow-border',
        'transition-all duration-300',
        className
      )}
    >
      {title && (
        <div className="flex items-center gap-2 mb-3 px-1">
          {Icon && <Icon className="w-4 h-4 text-[var(--aifs-accent)]" />}
          <h3 className="text-sm font-medium text-[var(--aifs-text-primary)]">{title}</h3>
        </div>
      )}
      {children}
    </div>
  );
}
