export default function Home() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#080808',
        color: '#f5f5f5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'IBM Plex Mono, monospace',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <p
          style={{
            color: '#b91c1c',
            fontSize: 11,
            letterSpacing: '0.25em',
            marginBottom: 32,
            textTransform: 'uppercase',
          }}
        >
          ⚖ uWarden
        </p>

        <h1
          style={{
            fontFamily: 'Lora, serif',
            fontStyle: 'italic',
            fontSize: 32,
            lineHeight: 1.4,
            marginBottom: 20,
          }}
        >
          The AI accountability extension that roasts your distractions.
        </h1>

        <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.7, marginBottom: 40 }}>
          Block the sites that steal your focus. When you slip, uWarden takes over the
          tab with a personalized roast — and the only way out is admitting it in writing.
          Free, forever.
        </p>

        <p style={{ color: '#4b5563', fontSize: 12 }}>
          Coming soon to the Chrome Web Store.
        </p>
      </div>
    </div>
  );
}
