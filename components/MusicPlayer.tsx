"use client";

import { useEffect, useRef, useState } from "react";

const TRACKS = [
  { title: "Meme Madness", src: "/audio/meme-madness.mp3" },
  { title: "Meme Madness II", src: "/audio/meme-madness-2.mp3" },
  { title: "Meme Madness III", src: "/audio/meme-madness-3.mp3" },
];

function shuffledOrder(length: number) {
  const arr = Array.from({ length }, (_, i) => i);
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Lives in the root layout so it survives client-side route navigation
 * in the App Router (it's never unmounted just from switching pages).
 *
 * Behavior: if the URL has ?signedIn=1 (set by /api/auth/verify right
 * after a successful magic-link login), music starts automatically
 * 5 seconds later — no click required from the user.
 *
 * Caveat that's worth knowing: browsers only allow autoplay-with-sound
 * following a real user gesture, and that gesture "expires" pretty fast.
 * Clicking the magic link in their email counts as a gesture for that
 * navigation, but 5 seconds of page life afterward is right at the edge
 * of what some browsers (mobile Safari especially) will still allow.
 * So this tries the auto-start, and if the browser blocks it, it falls
 * back to a small one-tap "Enable sound" prompt instead of failing silently.
 */
export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [order] = useState(() => shuffledOrder(TRACKS.length));
  const [orderIndex, setOrderIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needsTapToEnable, setNeedsTapToEnable] = useState(false);
  const [volume, setVolume] = useState(0.5);

  const currentTrack = TRACKS[order[orderIndex]];

  // Trigger: fresh sign-in → wait 5s → attempt autoplay
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signedIn") !== "1") return;

    // Clean the query param so refresh/back doesn't re-trigger it
    const cleanUrl = window.location.pathname;
    window.history.replaceState({}, "", cleanUrl);

    const timer = setTimeout(async () => {
      try {
        await audioRef.current?.play();
        setIsPlaying(true);
      } catch {
        // Autoplay blocked — show the fallback tap prompt instead of
        // silently failing.
        setNeedsTapToEnable(true);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  function enableSound() {
    audioRef.current?.play();
    setIsPlaying(true);
    setNeedsTapToEnable(false);
  }

  function togglePlay() {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      audioRef.current?.play();
      setIsPlaying(true);
    }
  }

  function nextTrack() {
    setOrderIndex((i) => (i + 1) % TRACKS.length);
  }

  return (
    <div style={styles.player}>
      <audio
        ref={audioRef}
        src={currentTrack.src}
        onEnded={nextTrack}
        preload="metadata" // don't preload every track for every user — just the current one
      />

      {needsTapToEnable && (
        <button style={styles.tapPrompt} onClick={enableSound}>
          🔊 Tap for sound
        </button>
      )}

      <div style={styles.controls}>
        <button style={styles.iconBtn} onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
          {isPlaying ? "⏸" : "▶"}
        </button>
        <span style={styles.trackName}>{currentTrack.title}</span>
        <button style={styles.iconBtn} onClick={nextTrack} aria-label="Next track">
          ⏭
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          style={styles.volume}
          aria-label="Volume"
        />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  player: {
    position: "fixed",
    bottom: 12,
    right: 12,
    zIndex: 50,
    fontFamily: "'Courier New', monospace",
  },
  controls: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#0A0A10",
    border: "1px solid #2A2A33",
    borderRadius: 10,
    padding: "8px 12px",
    color: "#F3EEE1",
  },
  iconBtn: {
    background: "none",
    border: "none",
    color: "#F3EEE1",
    cursor: "pointer",
    fontSize: 16,
  },
  trackName: {
    fontSize: 12,
    color: "#8B8A96",
    minWidth: 100,
  },
  volume: {
    width: 60,
  },
  tapPrompt: {
    marginBottom: 8,
    background: "#F4B942",
    color: "#0A0A10",
    border: "none",
    borderRadius: 8,
    padding: "8px 14px",
    fontWeight: 700,
    cursor: "pointer",
  },
};
