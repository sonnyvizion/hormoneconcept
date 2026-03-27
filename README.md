# Hormone Theme (Shopify)

Base de theme Shopify creee from scratch pour demarrer rapidement en CLI.

## Prerequis

- Node.js 18+
- Shopify CLI installe (`npm i -g @shopify/cli @shopify/theme`)
- Un store Shopify de dev

## Lancer en local

```bash
cd theme-hormone
shopify auth login
shopify theme dev --store=TON-STORE.myshopify.com
```

## Push du theme

```bash
shopify theme push --store=TON-STORE.myshopify.com
```
