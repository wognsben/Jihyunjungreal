export const Footer = () => {
  return (
    <footer className="py-2 md:py-6">
      <p 
        className="text-left md:text-center tracking-wider text-[12px] font-[SansSerif]"
        style={{
          color: 'var(--premium-black)',
          opacity:0.5,
          letterSpacing: '0.05em',
        }}
      >
        © 2026 Jihyun Jung. All rights reserved.
      </p>

      <style>{`
        footer {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </footer>
  );
};