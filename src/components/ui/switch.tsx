import * as React from "react"
import * as SwitchPrimitive from "@radix-ui/react-switch"

import { cn } from "@/lib/utils"

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-5 w-9 shrink-0 items-center rounded-sm border border-[rgba(168,162,158,0.2)] shadow-xs transition-all duration-500 outline-none",
        "data-[state=checked]:bg-[#a8a29e] data-[state=unchecked]:bg-[rgba(168,162,158,0.1)]",
        "focus-visible:ring-1 focus-visible:ring-[rgba(168,162,158,0.5)]",
        "disabled:cursor-not-allowed disabled:opacity-40",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-4 w-4 rounded-sm ring-0 transition-all duration-500",
          "data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0",
          "data-[state=checked]:bg-[#0a0a0a] data-[state=unchecked]:bg-[#a8a29e]"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
