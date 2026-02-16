# KlineCharts Pro

A professional cryptocurrency trading dashboard with real-time market data, interactive charts, and technical analysis tools.

**Live Demo:** [klinecharts-pro.vercel.app](https://klinecharts-pro.vercel.app)

## Features

- **Real-Time Charts** — Live candlestick charts powered by KlineCharts v9 with WebSocket streaming from Binance
- **8 Trading Pairs** — BTC, ETH, SOL, BNB, XRP, ADA, DOGE, SUI (all USDT pairs)
- **7 Timeframes** — 1m, 5m, 15m, 1H, 4H, 1D, 1W
- **3 Chart Types** — Candlestick, OHLC, Area
- **11 Technical Indicators** — MA, EMA, BOLL, SAR, BBI (overlay) + VOL, MACD, KDJ, RSI, ATR, DMI, OBV (sub-chart)
- **Live Order Book** — Real-time bid/ask depth with volume visualization
- **24h Market Data** — Price, change %, high, low, volume
- **Watchlist** — Quick switching between trading pairs

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org) (App Router) |
| Charts | [KlineCharts v9](https://klinecharts.com) |
| Styling | [Tailwind CSS](https://tailwindcss.com) |
| Data | [Binance API](https://binance-docs.github.io/apidocs/) (REST + WebSocket) |
| Deploy | [Vercel](https://vercel.com) |

## Getting Started

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

## Project Structure

```
src/app/
  page.tsx        # Main dashboard component (chart, order book, watchlist)
  lib/utils.ts    # Binance API integration, WebSocket, types, constants
  layout.tsx      # Root layout with dark theme
  globals.css     # Base styles, animations, scrollbar
```

## License

MIT License - see [LICENSE](LICENSE) for details.
