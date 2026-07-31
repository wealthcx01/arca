# "Kraken D" is not a viable ARCA pricing source — confirmed mismatch

## Finding

An instruction circulated to "aggregate an API using Kraken D as the data source" for ARCA. Researched both plausible readings; neither fits.

1. **Kraken (crypto exchange)** — has a public REST/WebSocket market-data API, but it is exclusively crypto asset pairs (BTC/USD, ETH/USD, etc.): order books, OHLC candles, tickers. No card/collectibles/grading data, and no mechanism to add any.
2. **KrakenD** — an unrelated open-source/enterprise API *gateway* product (routing, rate-limiting, request aggregation in front of your own backend). It supplies no data of its own — it's plumbing, not a source.
3. Third-party resellers of "Kraken market data" (e.g. Amberdata) are still reselling the crypto exchange's data — still not cards.

**Conclusion:** both readings are dead ends for graded trading-card prices. This was likely a mis-transcribed vendor name or a term carried over from an unrelated project. Founder is going back to confirm the actual intended source name.

**Action for anyone who sees "Kraken D" referenced again:** do not scope work against it. Ask for the real source name — check first whether it's one of ARCA's existing providers (tcgdex, tcgcsv, pokemon-tcg, pokemon-price-tracker, poketrace, pricecharting) before assuming it's new.

