import { twMerge } from "tailwind-merge";

/** Joins class names and resolves Tailwind conflicts so a later `className` override wins over component defaults. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
