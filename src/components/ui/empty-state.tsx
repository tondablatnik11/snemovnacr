// Konzistentní empty state komponenta — používá se na všech stránkách
// s prázdným stavem (žádná data, žádné výsledky hledání).

import Link from "next/link";
import { type LucideIcon, ArrowRight, Inbox } from "lucide-react";
import { cn } from "~/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "p-12 text-center border border-dashed rounded-md bg-card space-y-3",
        className
      )}
    >
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <h3 className="font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">{description}</p>
        )}
      </div>
      {action && (
        <div className="pt-2">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm transition-colors"
            >
              {action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}