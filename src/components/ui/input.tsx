import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";

const FIELD_CLASSES =
  "w-full rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary disabled:cursor-not-allowed disabled:opacity-50";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className = "", ...props }, ref) => <input ref={ref} className={`${FIELD_CLASSES} ${className}`} {...props} />
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className = "", ...props }, ref) => (
    <textarea ref={ref} className={`${FIELD_CLASSES} min-h-[5rem] ${className}`} {...props} />
  )
);
Textarea.displayName = "Textarea";
