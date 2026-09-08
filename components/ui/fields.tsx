import * as React from "react";
import { cn } from "@/lib/utils";

/** text-base on mobile avoids iOS focus zoom; slightly taller hit targets */
const field =
  "flex w-full min-w-0 rounded-lg border border-border bg-white px-3 outline-none ring-ring placeholder:text-slate-400 focus:ring-2 text-base md:text-sm";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return <input className={cn(field, "h-11 md:h-10", className)} {...props} />;
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return <textarea className={cn(field, "min-h-28 py-2.5 md:min-h-24", className)} {...props} />;
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return <label className={cn("text-sm font-medium text-slate-700", className)} {...props} />;
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return <select className={cn(field, "h-11 md:h-10", className)} {...props} />;
}
