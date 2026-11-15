import * as React from "react";
import { Field } from "./field";
import { Input } from "@/components/ui/input";

interface InputFieldProps extends React.ComponentProps<"input"> {
  label: string;
  hint?: string;
  error?: string;
}

export const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  function InputField({ label, hint, error, id, className, ...props }, ref) {
    const inputId = id || React.useId();
    return (
      <Field label={label} hint={hint} error={error} id={inputId}>
        <Input
          id={inputId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={
            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
          }
          className={className}
          {...props}
        />
      </Field>
    );
  },
);
