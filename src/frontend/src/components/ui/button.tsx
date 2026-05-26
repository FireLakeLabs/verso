import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Button({
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(
        "inline-flex min-h-10 cursor-default items-center justify-center gap-2 whitespace-nowrap rounded-md border border-transparent bg-primary px-4 font-bold text-primary-foreground [&_svg]:size-4 [&_svg]:shrink-0",
        className,
      )}
      {...props}
    />
  );
}
