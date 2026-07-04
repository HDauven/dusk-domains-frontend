type MetricSummaryItem = {
  ariaLabel?: string
  label: string
  value: string | number
}

export function MetricSummary({
  ariaLabel,
  items,
}: {
  ariaLabel: string
  items: MetricSummaryItem[]
}) {
  return (
    <div className="my-names-summary" aria-label={ariaLabel}>
      {items.map((item) => (
        <div aria-label={item.ariaLabel} key={item.label}>
          <strong>{item.value}</strong>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
