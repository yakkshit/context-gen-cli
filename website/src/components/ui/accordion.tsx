"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccordionContextValue {
  openItem: string | null;
  toggleItem: (value: string) => void;
}

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export function Accordion({
  children,
  className,
  defaultValue = null,
}: {
  children: React.ReactNode;
  className?: string;
  defaultValue?: string | null;
}) {
  const [openItem, setOpenItem] = React.useState<string | null>(defaultValue);

  const toggleItem = (val: string) => {
    setOpenItem((prev) => (prev === val ? null : val));
  };

  return (
    <AccordionContext.Provider value={{ openItem, toggleItem }}>
      <div className={cn("space-y-2.5", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  value,
  children,
  className,
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card/60 overflow-hidden transition-all duration-150 hover:border-border/90",
        className
      )}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, { value });
        }
        return child;
      })}
    </div>
  );
}

export function AccordionTrigger({
  value,
  children,
  className,
}: {
  value?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(AccordionContext);
  if (!context || !value) return null;
  const isOpen = context.openItem === value;

  return (
    <button
      type="button"
      onClick={() => context.toggleItem(value)}
      className={cn(
        "flex w-full items-center justify-between p-4 sm:p-4.5 text-left text-sm font-medium text-foreground transition-colors hover:text-primary cursor-pointer select-none",
        className
      )}
    >
      <span>{children}</span>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
          isOpen && "rotate-180 text-primary"
        )}
      />
    </button>
  );
}

export function AccordionContent({
  value,
  children,
  className,
}: {
  value?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const context = React.useContext(AccordionContext);
  if (!context || !value) return null;
  const isOpen = context.openItem === value;

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "px-4 pb-4 sm:px-4.5 sm:pb-4.5 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3 animate-in fade-in-50 duration-150",
        className
      )}
    >
      {children}
    </div>
  );
}
