'use client';

export default function BackgroundGradient() {
  return (
    <div className="fixed inset-0 -z-20">
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary/6 via-transparent to-primary/4"
        style={{ backgroundSize: '200% 200%', animation: 'gradient-move 50s ease-in-out infinite' }}
      />

      <div
        className="absolute inset-0 bg-gradient-to-tr from-accent/4 via-transparent to-accent/6"
        style={{ backgroundSize: '180% 180%', animation: 'gradient-move 60s ease-in-out infinite reverse' }}
      />

      <div className="absolute inset-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 25% 35%, hsl(var(--primary) / 0.08) 0%, transparent 50%),\
                   radial-gradient(circle at 75% 65%, hsl(var(--accent) / 0.05) 0%, transparent 50%)',
            backgroundSize: '150% 150%',
            animation: 'gradient-mesh-1 45s ease-in-out infinite',
          }}
        />
      </div>
    </div>
  );
}


