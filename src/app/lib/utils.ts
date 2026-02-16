import type { KLineData } from "klinecharts";

// ========== Types ==========

export interface SymbolInfo {
  symbol: string;
  name: string;
  pair: string;
}

export interface TickerData {
  price: string;
  priceChange: string;
  priceChangePercent: string;
  high: string;
  low: string;
  volume: string;
  quoteVolume: string;
}

export interface OrderBookEntry {
  price: string;
  qty: string;
  total: number;
}

export const SYMBOLS: SymbolInfo[] = [
  { symbol: "BTCUSDT", name: "Bitcoin", pair: "BTC/USDT" },
  { symbol: "ETHUSDT", name: "Ethereum", pair: "ETH/USDT" },
  { symbol: "SOLUSDT", name: "Solana", pair: "SOL/USDT" },
  { symbol: "BNBUSDT", name: "BNB", pair: "BNB/USDT" },
  { symbol: "XRPUSDT", name: "XRP", pair: "XRP/USDT" },
  { symbol: "ADAUSDT", name: "Cardano", pair: "ADA/USDT" },
  { symbol: "DOGEUSDT", name: "Dogecoin", pair: "DOGE/USDT" },
  { symbol: "SUIUSDT", name: "Sui", pair: "SUI/USDT" },
];

export const TIMEFRAMES = [
  { label: "1m", value: "1m", interval: "1m" },
  { label: "5m", value: "5m", interval: "5m" },
  { label: "15m", value: "15m", interval: "15m" },
  { label: "1H", value: "1h", interval: "1h" },
  { label: "4H", value: "4h", interval: "4h" },
  { label: "1D", value: "1d", interval: "1d" },
  { label: "1W", value: "1w", interval: "1w" },
];

export const MAIN_INDICATORS = ["MA", "EMA", "BOLL", "SAR", "BBI"];
export const SUB_INDICATORS = ["VOL", "MACD", "KDJ", "RSI", "ATR", "DMI", "OBV"];

// ========== Binance API ==========

const BINANCE_API = "https://api.binance.com/api/v3";

export async function fetchKlineData(
  symbol: string,
  interval: string,
  limit: number = 500,
): Promise<KLineData[]> {
  try {
    const res = await fetch(
      `${BINANCE_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`,
    );
    const data = await res.json();
    return data.map((d: any[]) => ({
      timestamp: d[0],
      open: parseFloat(d[1]),
      high: parseFloat(d[2]),
      low: parseFloat(d[3]),
      close: parseFloat(d[4]),
      volume: parseFloat(d[5]),
      turnover: parseFloat(d[7]),
    }));
  } catch {
    return generateFallbackData(500);
  }
}

export async function fetchTicker(symbol: string): Promise<TickerData | null> {
  try {
    const res = await fetch(`${BINANCE_API}/ticker/24hr?symbol=${symbol}`);
    const d = await res.json();
    return {
      price: d.lastPrice,
      priceChange: d.priceChange,
      priceChangePercent: d.priceChangePercent,
      high: d.highPrice,
      low: d.lowPrice,
      volume: d.volume,
      quoteVolume: d.quoteVolume,
    };
  } catch {
    return null;
  }
}

export async function fetchOrderBook(
  symbol: string,
  limit: number = 15,
): Promise<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }> {
  try {
    const res = await fetch(
      `${BINANCE_API}/depth?symbol=${symbol}&limit=${limit}`,
    );
    const data = await res.json();
    const mapEntries = (entries: string[][]) => {
      let runningTotal = 0;
      return entries.map((e) => {
        runningTotal += parseFloat(e[1]);
        return { price: e[0], qty: e[1], total: runningTotal };
      });
    };
    return {
      bids: mapEntries(data.bids),
      asks: mapEntries(data.asks.reverse()),
    };
  } catch {
    return { bids: [], asks: [] };
  }
}

// ========== WebSocket ==========

export function createKlineWebSocket(
  symbol: string,
  interval: string,
  onMessage: (data: KLineData) => void,
): WebSocket | null {
  try {
    const ws = new WebSocket(
      `wss://stream.binance.com:9443/ws/${symbol.toLowerCase()}@kline_${interval}`,
    );
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const k = msg.k;
      if (k) {
        onMessage({
          timestamp: k.t,
          open: parseFloat(k.o),
          high: parseFloat(k.h),
          low: parseFloat(k.l),
          close: parseFloat(k.c),
          volume: parseFloat(k.v),
          turnover: parseFloat(k.q),
        });
      }
    };
    return ws;
  } catch {
    return null;
  }
}

// ========== Formatting ==========

export function formatNumber(num: number, decimals: number = 2): string {
  if (num >= 1e9) return (num / 1e9).toFixed(2) + "B";
  if (num >= 1e6) return (num / 1e6).toFixed(2) + "M";
  if (num >= 1e3) return (num / 1e3).toFixed(2) + "K";
  return num.toFixed(decimals);
}

export function formatPrice(price: number | string): string {
  const p = typeof price === "string" ? parseFloat(price) : price;
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toFixed(6);
}

// ========== Fallback Data ==========

function generateFallbackData(size: number): KLineData[] {
  const data: KLineData[] = [];
  let timestamp = Date.now() - size * 60 * 1000;
  let price = 50000;
  for (let i = 0; i < size; i++) {
    price += (Math.random() - 0.495) * price * 0.01;
    const high = price * (1 + Math.random() * 0.01);
    const low = price * (1 - Math.random() * 0.01);
    const open = low + Math.random() * (high - low);
    const close = low + Math.random() * (high - low);
    const volume = Math.random() * 100 + 10;
    data.push({
      timestamp,
      open, high, low, close, volume,
      turnover: ((open + close) / 2) * volume,
    });
    timestamp += 60 * 1000;
  }
  return data;
}
