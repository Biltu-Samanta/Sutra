import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "subtle" | "ghost" | "dark" | "icon";
  children: ReactNode;
};

export function Button({ variant = "subtle", className, children, ...props }: Props) {
  return <button className={cn("ui-button", `ui-button--${variant}`, className)} {...props}>{children}</button>;
}
