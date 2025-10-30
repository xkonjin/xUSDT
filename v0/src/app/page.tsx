export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-10 gap-8">
      <h1 className="text-3xl font-semibold">xUSDT v0 Demo</h1>
      <div className="grid gap-4 md:grid-cols-2 w-full max-w-3xl">
        <a
          href="/merchant"
          className="group rounded-lg border border-gray-300 dark:border-neutral-700 px-5 py-4 hover:bg-gray-100 dark:hover:bg-neutral-800/30"
        >
          <h2 className="mb-2 text-xl font-semibold flex items-center justify-between">
            Merchant
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </h2>
          <p className="m-0 text-sm opacity-80">Inspect Plasma config and merchant API health.</p>
        </a>
        <a
          href="/client"
          className="group rounded-lg border border-gray-300 dark:border-neutral-700 px-5 py-4 hover:bg-gray-100 dark:hover:bg-neutral-800/30"
        >
          <h2 className="mb-2 text-xl font-semibold flex items-center justify-between">
            Client Demo
            <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
          </h2>
          <p className="m-0 text-sm opacity-80">Request PaymentRequired, sign EIP‑3009, settle on Plasma.</p>
        </a>
      </div>
    </main>
  );
}
