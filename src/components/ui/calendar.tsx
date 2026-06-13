"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3", className)}
      classNames={{
        root: "relative",
        months: "flex flex-col sm:flex-row gap-4",
        month: "flex flex-col gap-3",
        month_caption: "flex justify-center items-center h-8",
        caption_label: "text-sm font-medium text-foreground",
        nav: "absolute inset-x-1 top-1 flex items-center justify-between z-10",
        button_previous:
          "size-7 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground hover:border-ring/60 transition",
        button_next:
          "size-7 flex items-center justify-center rounded-md border border-input text-muted-foreground hover:text-foreground hover:border-ring/60 transition",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-8 text-[11px] font-normal text-muted-foreground",
        week: "flex mt-1",
        day: "p-0 text-center",
        day_button:
          "size-8 rounded-md text-sm text-foreground/90 hover:bg-accent hover:text-accent-foreground transition aria-selected:opacity-100",
        selected: "[&>button]:bg-violet-600 [&>button]:text-white [&>button]:hover:bg-violet-500",
        range_start: "rounded-l-md",
        range_end: "rounded-r-md",
        range_middle: "[&>button]:!bg-violet-500/20 [&>button]:!text-foreground rounded-none",
        today: "[&>button]:font-bold [&>button]:underline underline-offset-2",
        outside: "[&>button]:text-muted-foreground/40",
        disabled: "[&>button]:text-muted-foreground/30 [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <ChevronLeft className="size-4" /> : <ChevronRight className="size-4" />,
      }}
      {...props}
    />
  );
}

export { Calendar };
