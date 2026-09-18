export default function ProductsLoading() {
  return (
    <main aria-busy="true" aria-label="Loading products" className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 h-20 animate-pulse bg-zinc-100" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div className="h-72 animate-pulse border border-zinc-200 bg-zinc-100" key={item} />
        ))}
      </div>
    </main>
  );
}
