import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

interface FieldProps {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Owns label, hint, error, and spacing for every typed field — defined
 * once here so vertical rhythm and error styling stay consistent across
 * the whole form instead of being hand-repeated per field.
 */
export function Field({ label, hint, error, id, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
