"use client";

import { useState } from "react";

export default function Home() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("idle");

    const res = await fetch("/api/auth/request-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email }),
    });

    if (res.ok) {
      setStatus("sent");
    } else {
      const data = await res.json();
      setErrorMsg(data.error ?? "something went wrong");
      setStatus("error");
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", fontFamily: "'Courier New', monospace" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 1 }}>MEME MADNESS TRIAL</h1>
      <p style={{ color: "#8B8A96", fontSize: 13 }}>
        3-day unofficial fan trial. 20,000 free credits daily. No wallet, no cash value.
      </p>

      {status === "sent" ? (
        <p style={{ color: "#F4B942", marginTop: 24 }}>
          Check your email — tap the link to enter the arena.
        </p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 24 }}>
          <input
            placeholder="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            maxLength={20}
            style={inputStyle}
          />
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>
            SEND SIGN-IN LINK
          </button>
          {status === "error" && <p style={{ color: "#FF5A5F", fontSize: 12 }}>{errorMsg}</p>}
        </form>
      )}
    </main>
  );
}

const inputStyle: React.CSSProperties = {
  background: "#15151C",
  border: "1px solid #2A2A33",
  borderRadius: 8,
  padding: "10px 12px",
  color: "#F3EEE1",
  fontFamily: "inherit",
};

const buttonStyle: React.CSSProperties = {
  background: "#FF5A5F",
  border: "none",
  borderRadius: 8,
  padding: "12px",
  color: "#0A0A10",
  fontWeight: 900,
  cursor: "pointer",
  letterSpacing: 1,
};
