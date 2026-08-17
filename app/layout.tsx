import MusicPlayer from "@/components/MusicPlayer";

export const metadata = {
  title: "Meme Madness Trial",
  description: "Unofficial fan trial. Predict memecoin moves with free virtual credits.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ background: "#0A0A10", color: "#F3EEE1", margin: 0, minHeight: "100vh" }}>
        {children}

        <MusicPlayer />

        <footer
          style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            fontFamily: "'Courier New', monospace",
            fontSize: 11,
            color: "#6B6B78",
            textAlign: "center",
            padding: "6px 0",
            background: "rgba(10,10,16,0.9)",
            borderTop: "1px solid #2A2A33",
          }}
        >
          Unofficial fan build. Not affiliated with, endorsed by, or connected to Cade Market Inc.
          Virtual credits only — no cash value, no prizes, no wallet required.
        </footer>
      </body>
    </html>
  );
}
