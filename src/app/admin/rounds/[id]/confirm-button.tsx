"use client";

import { useFormStatus } from "react-dom";

/** Submit button that optionally asks "are you sure?" and shows a pending state. */
export function ConfirmButton({
  children,
  confirm,
  className,
  disabled,
}: {
  children: React.ReactNode;
  confirm?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      className={className}
      disabled={pending || disabled}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {pending ? "Working…" : children}
    </button>
  );
}
