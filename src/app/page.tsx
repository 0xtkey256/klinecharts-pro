"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { init, dispose, type Chart, CandleType, LineType, TooltipShowRule } from "klinecharts";
import {
  SYMBOLS, TIMEFRAMES, MAIN_INDICATORS, SUB_INDICATORS,
  fetchKlineData, fetchTicker, fetchOrderBook, createKlineWebSocket,
  formatNumber, formatPrice,
  type SymbolInfo, type TickerData, type OrderBookEntry,
} from "./lib/utils";

// ========== Chart Styles ==========
const CHART_STYLES = {
  grid: {
    show: true,
    horizontal: { show: true, size: 1, color: "#1a1d23", style: LineType.Dashed },
    vertical: { show: true, size: 1, color: "#1a1d23", style: LineType.Dashed },
  },
  candle: {
    type: CandleType.CandleSolid,
    bar: {
      upColor: "#0ecb81",
      downColor: "#f6465d",
      upBorderColor: "#0ecb81",
      downBorderColor: "#f6465d",
      upWickColor: "#0ecb81",
      downWickColor: "#f6465d",
    },
    priceMark: {
      show: true,
      last: { show: true, upColor: "#0ecb81", downColor: "#f6465d", line: { show: true, style: LineType.Dashed } },
    },
    tooltip: {
      showRule: TooltipShowRule.FollowCross,
      labels: ["T: ", "O: ", "H: ", "L: ", "C: ", "V: "],
    },
  },
  indicator: {
    lastValueMark: { show: true },
  },
  xAxis: {
    axisLine: { color: "#2a2e37" },
    tickLine: { color: "#2a2e37" },
    tickText: { color: "#848e9c" },
  },
  yAxis: {
    axisLine: { color: "#2a2e37" },
    tickLine: { color: "#2a2e37" },
    tickText: { color: "#848e9c" },
  },
  crosshair: {
    show: true,
    horizontal: { show: true, line: { color: "#848e9c44", style: LineType.Dashed } },
    vertical: { show: true, line: { color: "#848e9c44", style: LineType.Dashed } },
  },
  separator: { color: "#2a2e37" },
};

export default function Dashboard() {
  const chartRef = useRef<Chart | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const tickerIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const orderBookIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const [symbol, setSymbol] = useState<SymbolInfo>(SYMBOLS[0]);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[3]); // 1H default
  const [ticker, setTicker] = useState<TickerData | null>(null);
  const [orderBook, setOrderBook] = useState<{ bids: OrderBookEntry[]; asks: OrderBookEntry[] }>({ bids: [], asks: [] });
  const [mainIndicators, setMainIndicators] = useState<string[]>(["MA"]);
  const [subIndicators, setSubIndicators] = useState<string[]>(["VOL"]);
  const [chartType, setChartType] = useState<CandleType>(CandleType.CandleSolid);
  const [showSymbolList, setShowSymbolList] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize chart
  useEffect(() => {
    const chart = init("main-chart", { styles: CHART_STYLES });
    chartRef.current = chart;
    return () => { dispose("main-chart"); };
  }, []);

  // Load data when symbol/timeframe changes
  const loadData = useCallback(async () => {
    const chart = chartRef.current;
    if (!chart) return;
    setIsLoading(true);

    // Disconnect old WebSocket
    wsRef.current?.close();

    // Fetch historical data
    const data = await fetchKlineData(symbol.symbol, timeframe.interval);
    chart.applyNewData(data);

    // Apply chart type
    chart.setStyles({ candle: { type: chartType } });

    // Apply indicators
    chart.removeIndicator("candle_pane");
    mainIndicators.forEach((ind) => chart.createIndicator(ind, false, { id: "candle_pane" }));

    // Remove all sub panes first, then add selected
    SUB_INDICATORS.forEach((ind) => {
      try { chart.removeIndicator(ind); } catch { /* ignore */ }
    });
    subIndicators.forEach((ind) => chart.createIndicator(ind, false));

    // Connect WebSocket for real-time updates
    wsRef.current = createKlineWebSocket(symbol.symbol, timeframe.interval, (klineData) => {
      chart.updateData(klineData);
    });

    setIsLoading(false);
  }, [symbol, timeframe, chartType, mainIndicators, subIndicators]);

  useEffect(() => { loadData(); }, [loadData]);

  // Fetch ticker data periodically
  useEffect(() => {
    const update = async () => {
      const t = await fetchTicker(symbol.symbol);
      if (t) setTicker(t);
    };
    update();
    tickerIntervalRef.current = setInterval(update, 3000);
    return () => { if (tickerIntervalRef.current) clearInterval(tickerIntervalRef.current); };
  }, [symbol]);

  // Fetch order book periodically
  useEffect(() => {
    const update = async () => {
      const ob = await fetchOrderBook(symbol.symbol);
      setOrderBook(ob);
    };
    update();
    orderBookIntervalRef.current = setInterval(update, 2000);
    return () => { if (orderBookIntervalRef.current) clearInterval(orderBookIntervalRef.current); };
  }, [symbol]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { wsRef.current?.close(); };
  }, []);

  const toggleMainIndicator = (ind: string) => {
    setMainIndicators((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind],
    );
  };
  const toggleSubIndicator = (ind: string) => {
    setSubIndicators((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind],
    );
  };

  const priceUp = ticker && parseFloat(ticker.priceChangePercent) >= 0;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* ====== TOP BAR ====== */}
      <header className="flex h-12 items-center justify-between border-b border-[#2a2e37] bg-[#0b0e11] px-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-bold text-yellow-400">KlineCharts Pro</h1>
          <div className="h-5 w-px bg-[#2a2e37]" />

          {/* Symbol Selector */}
          <div className="relative">
            <button
              onClick={() => setShowSymbolList(!showSymbolList)}
              className="flex items-center gap-2 rounded px-3 py-1.5 text-sm font-semibold hover:bg-[#1a1d23]"
            >
              <span className="text-white">{symbol.pair}</span>
              <svg className="h-3 w-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSymbolList && (
              <div className="animate-fade-in absolute left-0 top-full z-50 mt-1 w-48 rounded border border-[#2a2e37] bg-[#1a1d23] py-1 shadow-xl">
                {SYMBOLS.map((s) => (
                  <button
                    key={s.symbol}
                    onClick={() => { setSymbol(s); setShowSymbolList(false); }}
                    className={`flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-[#2a2e37] ${s.symbol === symbol.symbol ? "text-yellow-400" : "text-gray-300"}`}
                  >
                    <span className="font-medium">{s.pair}</span>
                    <span className="text-xs text-gray-500">{s.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Ticker Info */}
        {ticker && (
          <div className="flex items-center gap-6 text-xs">
            <div>
              <span className={`text-lg font-bold ${priceUp ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                {formatPrice(ticker.price)}
              </span>
              <span className={`ml-2 text-sm ${priceUp ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                {priceUp ? "+" : ""}{parseFloat(ticker.priceChangePercent).toFixed(2)}%
              </span>
            </div>
            <div className="flex gap-4 text-gray-400">
              <div><span className="text-gray-600">24h High </span>{formatPrice(ticker.high)}</div>
              <div><span className="text-gray-600">24h Low </span>{formatPrice(ticker.low)}</div>
              <div><span className="text-gray-600">24h Vol </span>{formatNumber(parseFloat(ticker.volume))}</div>
            </div>
          </div>
        )}
      </header>

      {/* ====== MAIN CONTENT ====== */}
      <div className="flex flex-1 overflow-hidden">
        {/* ====== CHART AREA ====== */}
        <div className="flex flex-1 flex-col border-r border-[#2a2e37]">
          {/* Toolbar */}
          <div className="flex items-center gap-1 border-b border-[#2a2e37] px-2 py-1">
            {/* Timeframes */}
            <div className="flex items-center gap-0.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf)}
                  className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                    timeframe.value === tf.value
                      ? "bg-[#2a2e37] text-yellow-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            <div className="mx-2 h-4 w-px bg-[#2a2e37]" />

            {/* Chart Types */}
            <div className="flex items-center gap-0.5">
              {([
                { type: CandleType.CandleSolid, label: "Candle" },
                { type: CandleType.Ohlc, label: "OHLC" },
                { type: CandleType.Area, label: "Area" },
              ]).map((ct) => (
                <button
                  key={ct.type}
                  onClick={() => {
                    setChartType(ct.type);
                    chartRef.current?.setStyles({ candle: { type: ct.type } });
                  }}
                  className={`rounded px-2 py-1 text-xs ${
                    chartType === ct.type
                      ? "bg-[#2a2e37] text-yellow-400"
                      : "text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {ct.label}
                </button>
              ))}
            </div>

            <div className="mx-2 h-4 w-px bg-[#2a2e37]" />

            {/* Main Indicators */}
            <div className="flex items-center gap-0.5">
              {MAIN_INDICATORS.map((ind) => (
                <button
                  key={ind}
                  onClick={() => toggleMainIndicator(ind)}
                  className={`rounded px-2 py-1 text-xs ${
                    mainIndicators.includes(ind)
                      ? "bg-blue-500/20 text-blue-400"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>

            <div className="mx-2 h-4 w-px bg-[#2a2e37]" />

            {/* Sub Indicators */}
            <div className="flex items-center gap-0.5">
              {SUB_INDICATORS.map((ind) => (
                <button
                  key={ind}
                  onClick={() => toggleSubIndicator(ind)}
                  className={`rounded px-2 py-1 text-xs ${
                    subIndicators.includes(ind)
                      ? "bg-purple-500/20 text-purple-400"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  {ind}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Container */}
          <div className="relative flex-1">
            {isLoading && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0b0e11]/80">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-yellow-400 border-t-transparent" />
              </div>
            )}
            <div id="main-chart" className="h-full w-full" />
          </div>
        </div>

        {/* ====== RIGHT PANEL: ORDER BOOK ====== */}
        <div className="flex w-72 flex-col bg-[#0b0e11]">
          <div className="border-b border-[#2a2e37] px-3 py-2">
            <h3 className="text-xs font-semibold text-gray-400">Order Book</h3>
          </div>

          {/* Column Headers */}
          <div className="flex items-center justify-between px-3 py-1 text-[10px] text-gray-600">
            <span>Price (USDT)</span>
            <span>Amount</span>
            <span>Total</span>
          </div>

          {/* Asks (sells) */}
          <div className="flex flex-1 flex-col-reverse overflow-hidden">
            {orderBook.asks.map((ask, i) => (
              <div key={`ask-${i}`} className="group relative flex items-center justify-between px-3 py-[2px] text-[11px]">
                <div
                  className="absolute inset-y-0 right-0 bg-[#f6465d]/10"
                  style={{ width: `${Math.min(100, (ask.total / (orderBook.asks[orderBook.asks.length - 1]?.total || 1)) * 100)}%` }}
                />
                <span className="relative z-10 font-mono text-[#f6465d]">{formatPrice(ask.price)}</span>
                <span className="relative z-10 font-mono text-gray-400">{parseFloat(ask.qty).toFixed(4)}</span>
                <span className="relative z-10 font-mono text-gray-500">{ask.total.toFixed(4)}</span>
              </div>
            ))}
          </div>

          {/* Spread / Current Price */}
          <div className="border-y border-[#2a2e37] px-3 py-2 text-center">
            {ticker && (
              <span className={`text-base font-bold ${priceUp ? "text-[#0ecb81]" : "text-[#f6465d]"}`}>
                {formatPrice(ticker.price)}
              </span>
            )}
          </div>

          {/* Bids (buys) */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {orderBook.bids.map((bid, i) => (
              <div key={`bid-${i}`} className="group relative flex items-center justify-between px-3 py-[2px] text-[11px]">
                <div
                  className="absolute inset-y-0 right-0 bg-[#0ecb81]/10"
                  style={{ width: `${Math.min(100, (bid.total / (orderBook.bids[orderBook.bids.length - 1]?.total || 1)) * 100)}%` }}
                />
                <span className="relative z-10 font-mono text-[#0ecb81]">{formatPrice(bid.price)}</span>
                <span className="relative z-10 font-mono text-gray-400">{parseFloat(bid.qty).toFixed(4)}</span>
                <span className="relative z-10 font-mono text-gray-500">{bid.total.toFixed(4)}</span>
              </div>
            ))}
          </div>

          {/* Watchlist */}
          <div className="border-t border-[#2a2e37]">
            <div className="px-3 py-2">
              <h3 className="text-xs font-semibold text-gray-400">Watchlist</h3>
            </div>
            <div className="max-h-40 overflow-y-auto">
              {SYMBOLS.slice(0, 6).map((s) => (
                <button
                  key={s.symbol}
                  onClick={() => setSymbol(s)}
                  className={`flex w-full items-center justify-between px-3 py-1.5 text-xs hover:bg-[#1a1d23] ${
                    s.symbol === symbol.symbol ? "bg-[#1a1d23]" : ""
                  }`}
                >
                  <span className="font-medium text-gray-300">{s.pair}</span>
                  <span className="text-gray-500">{s.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
