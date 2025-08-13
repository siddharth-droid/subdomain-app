import * as React from "react"
import { cn } from "../../lib/utils"

interface PageLayoutProps {
  children: React.ReactNode
  className?: string
  title?: string
  description?: string
  actions?: React.ReactNode
}

const PageLayout = React.forwardRef<HTMLDivElement, PageLayoutProps>(
  ({ className, children, title, description, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex w-full flex-1 flex-col overflow-auto bg-background", className)}
        {...props}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col">
          {(title || description || actions) && (
            <div className="flex flex-col gap-4 p-6">
              <div className="flex w-full items-center justify-between gap-4 space-y-0.5">
                <div className="flex w-full flex-col">
                  {title && (
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">
                      {title}
                    </h1>
                  )}
                  {description && (
                    <p className="text-muted-foreground">{description}</p>
                  )}
                </div>
                {actions && <div className="flex-shrink-0">{actions}</div>}
              </div>
            </div>
          )}
          <div className="flex flex-1 p-6 pt-0">{children}</div>
        </div>
      </div>
    )
  }
)
PageLayout.displayName = "PageLayout"

export { PageLayout }