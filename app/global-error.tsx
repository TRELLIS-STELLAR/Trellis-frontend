'use client';

/**
 * Last-resort boundary for errors thrown by the root layout itself. It replaces
 * the whole document, so it renders its own <html> and <body>.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ background: '#0E1A16', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <main
          data-testid="global-error-boundary"
          role="alert"
          style={{ maxWidth: 480, margin: '15vh auto', padding: 24, textAlign: 'center' }}
        >
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Trellis hit an unexpected error</h1>
          <p style={{ marginTop: 8, color: '#cbd5e1' }}>Reload the app to continue.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{ marginTop: 24, padding: '8px 16px', borderRadius: 6, fontWeight: 600 }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
