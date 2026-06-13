import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '@/lib/utils'

interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
  width?: string | number
  height?: string | number
}

/**
 * Base Skeleton — a pulsing placeholder block.
 * Use Tailwind: animate-pulse + bg-muted-foreground/20 + rounded.
 */
function Skeleton({ className, width, height, style, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded bg-muted-foreground/20',
        className,
      )}
      style={{
        ...(width != null ? { width } : {}),
        ...(height != null ? { height } : {}),
        ...style,
      }}
      {...props}
    />
  )
}

/* ── Variants ─────────────────────────────────────────── */

/** A single text-line placeholder (full-width unless overridden). */
function SkeletonLine({ className, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn('h-4 w-full', className)}
      {...props}
    />
  )
}

/** A circular placeholder (default 40×40). */
function SkeletonCircle({ className, width = 40, height = 40, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn('rounded-full', className)}
      width={width}
      height={height}
      {...props}
    />
  )
}

/** A card-shaped placeholder (full-width, ~120px by default). */
function SkeletonCard({ className, width = '100%', height = 120, ...props }: SkeletonProps) {
  return (
    <Skeleton
      className={cn('rounded-xl', className)}
      width={width}
      height={height}
      {...props}
    />
  )
}

export {
  Skeleton,
  SkeletonLine,
  SkeletonCircle,
  SkeletonCard,
}
