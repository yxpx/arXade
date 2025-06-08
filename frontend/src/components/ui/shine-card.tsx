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
          "relative h-full overflow-hidden rounded-xl bg-gray-900 border border-white/10",
          containerClassName
        )}
        style={{ borderWidth: `${borderWidth}px` }}
        {...props}
      >
        <div
          className={cn(
            "relative h-full rounded-xl p-5",
            className
          )}
        >
          {children}
        </div>
      </div>
    );
  }
); 