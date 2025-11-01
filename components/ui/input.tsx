import * as React from "react"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={`
        flex h-10 w-full rounded-lg border border-border bg-background px-4 py-2 text-base
        placeholder:text-muted-foreground
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:cursor-not-allowed disabled:opacity-50
        transition-colors
        ${className || ""}
      `}
      ref={ref}
      {...props}
    />
  ),
)
Input.displayName = "Input"

export { Input }
