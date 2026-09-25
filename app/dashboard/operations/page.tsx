'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { OperationalHealth } from '@/lib/operational-health';

export default function OperationsDashboardPage() {
  const [health, setHealth] = useState<OperationalHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/operational-health')
      .then((response) => {
        if (!response.ok) throw new Error('Unable to load operational health');
        return response.json() as Promise<OperationalHealth>;
      })
      .then(setHealth)
      .catch((requestError: Error) => setError(requestError.message));
  }, []);

  return (
    <main className="min-h-screen px-4 py-12 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-trellis-leaf">
            Maintainer operations
          </p>
          <h1 className="mt-3 text-4xl font-bold">Operational health</h1>
          <p className="mt-3 max-w-2xl text-gray-300">
            A redacted view of unresolved work, stale records, reconciliation drift, and user-impacting incidents.
          </p>
        </header>

        {error && <p role="alert" className="rounded-lg border border-red-500/50 bg-red-500/10 p-4 text-red-200">{error}</p>}
        {!health && !error && <p aria-live="polite" className="text-gray-300">Loading operational health...</p>}

        {health && (
          <>
            <section aria-labelledby="health-categories" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <h2 id="health-categories" className="sr-only">Health categories</h2>
              {health.categories.map((category) => (
                <article key={category.key} className="rounded-lg border border-trellis-vine/30 bg-trellis-vine/10 p-5">
                  <p className="text-sm text-gray-300">{category.label}</p>
                  <p className="mt-2 text-4xl font-bold" aria-label={`${category.count} ${category.label}`}>
                    {category.count}
                  </p>
                  <p className={`mt-2 text-sm ${category.severity === 'critical' ? 'text-red-300' : category.severity === 'warning' ? 'text-yellow-300' : 'text-green-300'}`}>
                    {category.severity}
                  </p>
                  <Link className="mt-4 inline-block text-sm font-semibold text-trellis-leaf underline focus:outline-none focus:ring-2 focus:ring-trellis-leaf" href={category.href}>
                    Investigate records
                  </Link>
                </article>
              ))}
            </section>
            <p className="mt-6 text-xs text-gray-500">
              Last updated {new Date(health.generatedAt).toLocaleString()}. Personal contact and wallet data is excluded.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
