"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ShineCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  containerClassName?: string;
  borderWidth?: number;
}

export const ShineCard = React.forwardRef<HTMLDivElement, ShineCardProps>(
  ({ 
    children, 
    className, 
    containerClassName, 
    borderWidth = 1,
    ...props 
  }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "relative h-full overflow-hidden rounded-xl bg-gray-950/90 backdrop-blur-sm border border-gray-700/40 shadow-2xl shadow-black/50",
          containerClassName
        )}
        style={{ borderWidth: `${borderWidth}px` }}
        {...props}
      >
        <div
          className={cn(
            "relative h-full rounded-xl p-5 bg-gradient-to-br from-gray-900/20 to-transparent",
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }
); 