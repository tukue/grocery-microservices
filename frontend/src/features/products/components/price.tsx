type PriceProps = Readonly<{
  amount: number;
  currency: string;
  locale?: string;
}>;

export function Price({ amount, currency, locale }: PriceProps) {
  const formatted = new Intl.NumberFormat(locale, {
    currency,
    style: "currency",
  }).format(amount);

  return <span aria-label={formatted}>{formatted}</span>;
}
