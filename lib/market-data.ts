/**
 * Returns live USD market cap for a token, or null if unavailable.
 * NEVER fabricate a value — callers must treat null as "skip this tick,
 * try again next time."
 *
 * Swap in your chosen provider (Birdeye, DexScreener, etc.) here. Kept as
 * a single function so the rest of the app never talks to the provider
 * directly — one ingestion point, per the original spec's design.
 */
export async function fetchMarketCapUsd(contractAddr: string): Promise<number | null> {
  try {
    const primary = await fetchFromPrimary(contractAddr);
    if (primary !== null) return primary;
  } catch {
    // fall through to secondary
  }

  try {
    const secondary = await fetchFromSecondary(contractAddr);
    if (secondary !== null) return secondary;
  } catch {
    // fall through to null
  }

  return null;
}

async function fetchFromPrimary(contractAddr: string): Promise<number | null> {
  // TODO: wire up your chosen primary provider, e.g. DexScreener:
  // const res = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${contractAddr}`);
  // if (!res.ok) return null;
  // const data = await res.json();
  // const pair = data?.pairs?.[0];
  // return pair ? Number(pair.fdv ?? pair.marketCap) : null;
  return null;
}

async function fetchFromSecondary(contractAddr: string): Promise<number | null> {
  // TODO: wire up a fallback provider (Birdeye, etc.)
  return null;
}
