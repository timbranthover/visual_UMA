# Unified Wealth View

A working concept of a connected UMA, seen through the advisor's eyes: one household, many accounts, many sleeves, one person-level view, and an engine that understands it all.

Built for internal discussion. Sample data only; not a system of record. Halverston is a fictional firm.

## What it shows

| Screen | What it proves |
|---|---|
| **Overview** | One allocation for the person across every SWP / AAP account and sleeve, with findings the engine derives |
| **Holdings** | Drill person → account → sleeve → position → tax lot, or flip to *by security* and see the same Apple held in five places |
| **Tax** | A household gain budget, harvest candidates, and a wash-sale guard that checks both spouses and the IRAs |
| **Proposal** | One optimization across the household, live before/after, and approvals routed by who holds discretion under SWP / AAP rules |

A guided walkthrough (top bar) drives the app and explains each piece.

## Data model

```
Household ─┬─ Members
           ├─ Policy (target allocation, gain budget, issuer limit, drift band)
           └─ Accounts (registration, tax treatment, program SWP | AAP)
                └─ Sleeves (SMA | Funds, structure, discretion holder)
                     └─ Tax lots ──► Security master (with fund look-through)
```

Discretion follows typical SWP / AAP program rules: Model Delivery SMA sleeves → overlay manager (Halverston AM); manager-traded SMA sleeves → SMA manager; AAP fund sleeves → Financial Advisor; SWP fund sleeves → client.

## Engine (`src/lib/engine`)

- `snapshot.ts`: rolls every lot up to sleeve, account and household; allocation vs target; issuer exposure including fund look-through
- `tax.ts`: gain budget, harvest candidates, cross-household wash-sale conflicts, asset-location findings
- `proposal.ts`: generates the concentration trim, loss harvest and asset-location swap; runs a wash-sale guard over its own trades; applies trades to produce the after-state
- `insights.ts`: plain-language findings for the overview

`npm run check` prints the engine's full output for the sample household.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # static production build
```

Deploys to Vercel as a standard Next.js project with no configuration.
