# Drift SOL-PERP Auto Trader (Telegram Controlled)

Production-focused TypeScript bot for Drift Protocol (Solana) with configurable strategy/risk controls from Telegram.

## Features
- Drift Protocol SOL-PERP (cross-mode assumptions) with single-position control.
- EMA + RSI strategy, optional MACD/volume confirmation, adjustable live via Telegram.
- Risk controls: fixed or ATR SL/TP, max daily loss lock, cooldown, spread guardrails, kill switch.
- Telegram commands: `/on`, `/off`, `/leverage`, `/risk`, `/ema`, `/rsi`, `/macd`, `/tf`, `/sl`, `/tp`, `/atr`, `/maxloss`, `/cooldown`, `/status`, `/balance`, `/positions`, `/trades`, `/config`, `/kill`.
- Config persisted in `config/runtime-config.json`.
- Structured JSON logging.

## Folder Structure
```text
.
├── config/
│   └── runtime-config.json
├── src/
│   ├── config/
│   │   ├── schema.ts
│   │   └── store.ts
│   ├── exchange/
│   │   └── drift-client.ts
│   ├── risk/
│   │   └── risk-manager.ts
│   ├── strategy/
│   │   └── indicator-strategy.ts
│   ├── telegram/
│   │   └── bot.ts
│   ├── utils/
│   │   └── logger.ts
│   ├── main.ts
│   └── types.ts
├── tests/
│   ├── config-store.test.ts
│   └── risk-manager.test.ts
├── .env.example
├── package.json
└── tsconfig.json
```

## Setup
1. Install Node 20+.
2. Install deps:
   ```bash
   npm install
   ```
3. Configure env:
   ```bash
   cp .env.example .env
   ```
   Fill `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `SOLANA_KEYPAIR_JSON`, RPC/Drift settings.
4. Adjust `config/runtime-config.json` market + risk defaults.

## Run
```bash
npm run dev
```

Production:
```bash
npm run build
npm start
```

## VPS deployment (screen/pm2)

### screen
```bash
screen -S drift-bot
npm run build && npm start
# Ctrl+A then D to detach
```

### pm2
```bash
npm install -g pm2
npm run build
pm2 start dist/main.js --name drift-bot
pm2 save
pm2 startup
```

## Drift environment notes
- Mainnet/devnet controlled with `DRIFT_ENV` + `config/runtime-config.json`.
- Confirm `marketIndex` for `SOL-PERP` in chosen environment before live trading.
- This bot intentionally avoids centralized exchange API keys; execution is on-chain via Drift SDK.

## Safety notes
- Hard max leverage/capital checks are enforced in risk layer.
- Spread guard blocks entries when market is too wide.
- Daily max loss disables trading and sends Telegram alert.
- Kill switch closes open position and disables trading.

## Known implementation notes
- `getCandles` and spread source are deliberately pluggable placeholders and should be connected to your preferred Drift market-data path (WebSocket + fallback polling) for production reliability.
- Bracket orders are modeled as risk targets now; attach explicit reduce-only trigger orders if desired in your deployment.
