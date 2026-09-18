"use client";

type ProductErrorStateProps = Readonly<{
  onRetry: () => void;
}>;

export function ProductErrorState({ onRetry }: ProductErrorStateProps) {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-start justify-center gap-4 px-4 py-12 sm:px-6">
      <h1 className="text-2xl font-semibold text-zinc-950">Products are unavailable</h1>
      <p className="text-zinc-600">We could not load the catalogue. Please try again.</p>
      <button className="bg-zinc-900 px-4 py-2 text-white" onClick={onRetry} type="button">
        Try again
      </button>
    </main>
  );
}
