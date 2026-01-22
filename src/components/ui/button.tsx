import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-normal tracking-wide transition-all duration-500 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[rgba(168,162,158,0.5)] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0a] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        default:
          "border border-[rgba(168,162,158,0.3)] bg-transparent text-[#fafaf9] hover:bg-[rgba(168,162,158,0.1)] hover:border-[rgba(168,162,158,0.5)]",
        primary:
          "bg-[#a8a29e] text-[#0a0a0a] hover:bg-[#d6d3d1]",
        destructive:
          "border border-[rgba(157,107,107,0.3)] bg-transparent text-[#9d6b6b] hover:bg-[rgba(157,107,107,0.1)] hover:border-[rgba(157,107,107,0.5)]",
        outline:
          "border border-[rgba(168,162,158,0.1)] bg-transparent hover:bg-[rgba(168,162,158,0.05)] hover:border-[rgba(168,162,158,0.2)]",
        secondary:
          "bg-[rgba(168,162,158,0.1)] text-[#fafaf9] hover:bg-[rgba(168,162,158,0.15)]",
        ghost:
          "text-[#a8a29e] hover:bg-[rgba(168,162,158,0.1)] hover:text-[#fafaf9]",
        link:
          "text-[#a8a29e] underline-offset-4 hover:underline hover:text-[#fafaf9]",
        glow:
          "border border-[rgba(168,162,158,0.3)] bg-transparent text-[#fafaf9] glow hover:bg-[rgba(168,162,158,0.1)]",
      },
      size: {
        default: "h-10 px-6 py-2 rounded-sm",
        sm: "h-8 px-4 text-xs rounded-sm",
        lg: "h-11 px-8 rounded-sm",
        xl: "h-12 px-10 text-base rounded-sm",
        icon: "h-10 w-10 rounded-sm",
        "icon-sm": "h-8 w-8 rounded-sm",
        "icon-lg": "h-12 w-12 rounded-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
