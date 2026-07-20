import { useState } from "react";

type Validator = (value: string) => string | undefined;

export function useField(initial: string, validate?: Validator) {
  const [value, setValue] = useState(initial);
  const [touched, setTouched] = useState(false);
  const error = touched ? validate?.(value) : undefined;

  return {
    value,
    error,
    touched,
    setTouched: () => setTouched(true),
    onChange: (v: string) => setValue(v),
    reset: () => {
      setValue(initial);
      setTouched(false);
    },
  };
}

export const required =
  (label: string): Validator =>
  (v) =>
    v.trim().length === 0 ? `${label} is required` : undefined;

export const minLength =
  (n: number, label = "Password"): Validator =>
  (v) =>
    v.length < n ? `${label} must be at least ${n} characters` : undefined;

export const email: Validator = (v) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(v) ? undefined : "Enter a valid email address";
};

export function validateAll(
  fields: { value: string; error: string | undefined; setTouched: () => void }[]
): boolean {
  fields.forEach((f) => f.setTouched());
  return fields.every((f) => !f.error);
}
