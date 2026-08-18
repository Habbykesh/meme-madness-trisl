"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg("");

    const url = mode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload = mode === "login" ? { username, password } : { username, email, password };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      router.push("/?signedIn=1");
    } else {
      const data = await res.json();
      setErrorMsg(data.error ?? "something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: 420, margin: "0 auto", padding: "80px 20px", fontFamily: "'Courier New', monospace" }}>
      <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: 1 }}>MEME MADNESS TRIAL</h1>
      <p style={{ color: "#8B8A96", fontSize: 13 }}>
        3-day unofficial fan trial. 20,000 free credits daily. No wallet, no cash value.
      </p>

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
        {mode === "signup" && (
          <input
            type="email"
            placeholder="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={inputStyle}
          />
        )}
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={inputStyle}
        />
        <button type="submit" disabled={submitting} style={buttonStyle}>
          {submitting ? "..." : mode === "login" ? "LOG IN" : "SIGN UP"}
        </button>
        {errorMsg && <p style={{ color: "#FF5A5F", fontSize: 12 }}>{errorMsg}</p>}
      </form>

      <button
        onClick={() => {
          setMode(mode === "login" ? "signup" : "login");
          setErrorMsg("");
        }}
        style={{ background: "none", border: "none", color: "#8B8A96", fontSize: 12, marginTop: 16, cursor: "pointer", textDecoration: "underline" }}
      >
        {mode === "login" ? "need an account? sign up" : "already have an account? log in"}
      </button>
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
