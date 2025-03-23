import * as React from "react"
import { cn } from "@/lib/utils"

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline"
  size?: "default" | "sm" | "lg" | "icon"
}

const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex w-full",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
ButtonGroup.displayName = "ButtonGroup"

export { ButtonGroup } 