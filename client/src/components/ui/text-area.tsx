"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxRows?: number;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxRows, onChange, ...props }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);

    React.useImperativeHandle(
      ref,
      () => textareaRef.current as HTMLTextAreaElement
    );

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onChange) {
        onChange(e);
      }

      if (maxRows && textareaRef.current) {
        // Reset height to auto to get the correct scrollHeight
        textareaRef.current.style.height = "auto";

        // Calculate the height based on scrollHeight
        const scrollHeight = textareaRef.current.scrollHeight;

        // Calculate the height of a single line (approximately)
        const lineHeight =
          Number.parseInt(getComputedStyle(textareaRef.current).lineHeight) ||
          20;

        // Calculate the maximum height based on maxRows
        const maxHeight = lineHeight * maxRows;

        // Set the height to the minimum of scrollHeight and maxHeight
        textareaRef.current.style.height = `${Math.min(
          scrollHeight,
          maxHeight
        )}px`;
      }
    };

    return (
      <textarea
        className={cn(
          "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={textareaRef}
        onChange={handleChange}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
