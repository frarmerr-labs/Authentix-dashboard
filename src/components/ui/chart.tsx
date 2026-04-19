"use client"

import * as React from "react"
import { ResponsiveContainer, Tooltip } from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = Record<
  string,
  {
    label: string
    color?: string
  }
>

type ChartContextValue = {
  config: ChartConfig
}

const ChartContext = React.createContext<ChartContextValue | null>(null)

export function ChartContainer({
  config,
  children,
  className,
}: {
  config: ChartConfig
  children: React.ReactNode
  className?: string
}) {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => { setMounted(true) }, [])

  const style = React.useMemo(() => {
    const cssVars: Record<string, string> = {}

    for (const [key, value] of Object.entries(config)) {
      const color = value.color ?? “var(--chart-1)”
      cssVars[`--color-${key}`] = color
    }

    return cssVars as React.CSSProperties
  }, [config])

  return (
    <ChartContext.Provider value={{ config }}>
      {/*
        Recharts 3 ResponsiveContainer uses ResizeObserver to measure the parent div.
        During SSR and the initial paint the DOM has no real dimensions, so Recharts
        reports width/height = -1 and emits a console warning. We gate the
        ResponsiveContainer behind a `mounted` flag so it only renders after the
        browser has laid out the container and the measurement is valid.
      */}
      <div
        className={cn(
          “chart-container relative w-full min-h-[280px] h-[280px] sm:h-[300px] sm:min-h-[300px]”,
          className
        )}
        style={style}
      >
        {mounted && (
          <ResponsiveContainer width=”100%” height=”100%” minHeight={240}>
            {children}
          </ResponsiveContainer>
        )}
      </div>
    </ChartContext.Provider>
  )
}

export type ChartTooltipContentProps = {
  hideLabel?: boolean
  indicator?: "line" | "dot"
  nameKey?: string
  /** When set, formats the tooltip header label (e.g. ISO date → locale string). */
  labelFormatter?: (value: unknown) => string
} & {
  active?: boolean
  label?: unknown
  payload?: Array<{
    dataKey?: string
    name?: string
    value?: unknown
    payload?: Record<string, unknown>
  }>
}

export function ChartTooltipContent({
  hideLabel,
  indicator = "dot",
  nameKey,
  labelFormatter,
  active,
  label,
  payload,
}: ChartTooltipContentProps) {
  const ctx = React.useContext(ChartContext)

  if (!active || !payload || payload.length === 0) return null

  const firstPayload = payload[0]?.payload
  const resolvedLabel =
    (nameKey && firstPayload ? (firstPayload[nameKey] as unknown) : undefined) ??
    label

  const headerLabel =
    resolvedLabel != null
      ? labelFormatter
        ? labelFormatter(resolvedLabel)
        : String(resolvedLabel)
      : null

  return (
    <div className="rounded-md border bg-popover p-2 shadow-sm">
      {!hideLabel && headerLabel != null && (
        <div className="text-xs font-medium mb-1">{headerLabel}</div>
      )}
      <div className="space-y-1">
        {payload.map((item, idx) => {
          const key = (item.dataKey ?? item.name ?? "value") as string
          const cfg = ctx?.config?.[key]
          const payloadName =
            nameKey && item.payload ? (item.payload[nameKey] as unknown) : undefined
          const displayName = String(
            payloadName ?? cfg?.label ?? item.name ?? key
          )
          const value =
            typeof item.value === "number" ? item.value.toLocaleString() : item.value
          const payloadFill = item.payload?.fill
          const colorVar =
            (cfg?.color && `var(--color-${key})`) ??
            (typeof payloadFill === "string" ? payloadFill : undefined)

          return (
            <div key={`${key}-${idx}`} className="flex items-center gap-2 text-xs">
              {indicator === "line" ? (
                <span
                  className="h-0.5 w-3 rounded-full"
                  style={{ background: colorVar ?? "currentColor" }}
                />
              ) : (
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: colorVar ?? "currentColor" }}
                />
              )}
              <span className="text-muted-foreground">{displayName}</span>
              <span className="ml-auto font-medium tabular-nums">{String(value ?? 0)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function ChartTooltip({
  content,
  ...props
}: React.ComponentProps<typeof Tooltip> & {
  content?: React.ReactElement
}) {
  return (
    <Tooltip
      {...props}
      content={(tooltipProps) => {
        if (!content) return null
        return React.isValidElement(content)
          ? React.cloneElement(content, tooltipProps as unknown as object)
          : null
      }}
    />
  )
}

