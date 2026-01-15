'use client';

import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { ReactNode } from 'react';

interface TooltipProps {
  children: ReactNode;
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  delayDuration?: number;
  maxWidth?: number;
}

export function Tooltip({
  children,
  content,
  side = 'top',
  align = 'center',
  delayDuration = 0,
  maxWidth = 300,
}: TooltipProps) {
  if (!content) {
    return <>{children}</>;
  }

  return (
    <TooltipPrimitive.Provider delayDuration={delayDuration}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            align={align}
            sideOffset={5}
            className="z-50 px-3 py-2 text-sm bg-[#FFF7ED] text-[#9A3412] border border-[#FDBA74] rounded-lg shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95"
            style={{ maxWidth }}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-[#FFF7ED]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

export const TooltipProvider = TooltipPrimitive.Provider;

// Shared StatusBadge component used in field mapping tables
const STATUS_BADGE_STYLES = {
  Required: 'bg-red-100 text-red-700 border-red-300',
  Recommended: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  Optional: 'bg-blue-100 text-blue-700 border-blue-300',
  Conditional: 'bg-purple-100 text-purple-700 border-purple-300',
} as const;

type RequirementStatus = keyof typeof STATUS_BADGE_STYLES;

export function StatusBadge({ status }: { status: RequirementStatus }) {
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded border ${STATUS_BADGE_STYLES[status]}`}>
      {status}
    </span>
  );
}
