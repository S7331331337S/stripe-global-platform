export default function Phase1StatusPage() {
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: "2rem", maxWidth: 720 }}>
      <p style={{ letterSpacing: "0.16em", textTransform: "uppercase", fontSize: 12 }}>
        Phase 1
      </p>
      <h1>Stripe intelligence platform</h1>
      <p>
        Ledger, Connect destination charges, and programming-agent loops. G&apos;s Stock is
        tenant zero — not this app.
      </p>
      <ul>
        <li>GET /api/health</li>
        <li>POST /api/webhooks/stripe</li>
        <li>POST /api/tools/run (x-agent-secret)</li>
        <li>npm run agents:loop</li>
      </ul>
    </main>
  );
}
