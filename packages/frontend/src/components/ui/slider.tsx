import * as React from "react"
import { Slider as SliderPrimitive } from "radix-ui"

import { cn } from "@/utils"

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  const _values = React.useMemo(
    () =>
      Array.isArray(value)
        ? value
        : Array.isArray(defaultValue)
          ? defaultValue
          : [min, max],
    [value, defaultValue, min, max]
  )

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      className={cn(
        "relative flex h-8 w-full cursor-pointer touch-none items-center select-none md:h-6 data-disabled:cursor-not-allowed data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative grow overflow-hidden rounded-full bg-muted shadow-inner data-horizontal:h-2 data-horizontal:w-full md:data-horizontal:h-1.5 data-vertical:h-full data-vertical:w-2"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
        className="absolute bg-primary select-none data-horizontal:h-full data-vertical:w-full"
        />
      </SliderPrimitive.Track>
      {Array.from({ length: _values.length }, (_, index) => (
        <SliderPrimitive.Thumb
          data-slot="slider-thumb"
          key={index}
          className="relative block size-5 shrink-0 cursor-pointer rounded-full border-2 border-brand bg-card shadow-sm transition-[color,box-shadow,transform] select-none md:size-4 after:absolute after:-inset-2 hover:scale-105 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:outline-hidden active:scale-95 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
}

export { Slider }
