export type Receipt = Readonly<
  { status: "pending" } | { status: "ready"; content: string }
>;
