import type { AssetClassId, Security } from "../types";

/**
 * Security master (sample). Prices are illustrative, not live quotes.
 * Fund look-through weights approximate published top holdings and are
 * used only to measure issuer exposure.
 */

type S = Omit<Security, "id">;

const stock = (ticker: string, name: string, sector: string, price: number, assetClass: AssetClassId = "US_LARGE"): S => ({
  ticker, name, sector, price, assetClass, type: "Stock", taxProfile: "Efficient",
});

const adr = (ticker: string, name: string, sector: string, price: number, assetClass: AssetClassId = "INTL_DEV"): S => ({
  ticker, name, sector, price, assetClass, type: "ADR", taxProfile: "Efficient",
});

const muni = (ticker: string, name: string, price: number): S => ({
  ticker, name, price, assetClass: "MUNI", type: "Municipal bond", sector: "Municipal", taxProfile: "Exempt",
});

const etf = (ticker: string, name: string, assetClass: AssetClassId, price: number, taxProfile: Security["taxProfile"], lookThrough?: Security["lookThrough"]): S => ({
  ticker, name, assetClass, price, type: "ETF", sector: "Fund", taxProfile, lookThrough,
});

const raw: Record<string, S> = {
  // US large cap
  AAPL: stock("AAPL", "Apple Inc.", "Information Technology", 245.0),
  MSFT: stock("MSFT", "Microsoft Corp.", "Information Technology", 515.0),
  NVDA: stock("NVDA", "NVIDIA Corp.", "Information Technology", 182.0),
  AMZN: stock("AMZN", "Amazon.com Inc.", "Consumer Discretionary", 228.0),
  GOOGL: stock("GOOGL", "Alphabet Inc. Class A", "Communication Services", 236.0),
  META: stock("META", "Meta Platforms Inc.", "Communication Services", 712.0),
  AVGO: stock("AVGO", "Broadcom Inc.", "Information Technology", 338.0),
  LLY: stock("LLY", "Eli Lilly and Co.", "Health Care", 812.0),
  V: stock("V", "Visa Inc. Class A", "Financials", 352.0),
  COST: stock("COST", "Costco Wholesale Corp.", "Consumer Staples", 945.0),
  JPM: stock("JPM", "JPMorgan Chase & Co.", "Financials", 302.0),
  "BRK.B": stock("BRK.B", "Berkshire Hathaway Class B", "Financials", 488.0),
  JNJ: stock("JNJ", "Johnson & Johnson", "Health Care", 178.0),
  XOM: stock("XOM", "Exxon Mobil Corp.", "Energy", 114.0),
  UNH: stock("UNH", "UnitedHealth Group Inc.", "Health Care", 318.0),
  PG: stock("PG", "Procter & Gamble Co.", "Consumer Staples", 152.0),
  MRK: stock("MRK", "Merck & Co. Inc.", "Health Care", 92.0),
  CVX: stock("CVX", "Chevron Corp.", "Energy", 158.0),
  PEP: stock("PEP", "PepsiCo Inc.", "Consumer Staples", 146.0),
  HD: stock("HD", "Home Depot Inc.", "Consumer Discretionary", 398.0),
  KO: stock("KO", "Coca-Cola Co.", "Consumer Staples", 70.0),
  ABBV: stock("ABBV", "AbbVie Inc.", "Health Care", 214.0),
  CSCO: stock("CSCO", "Cisco Systems Inc.", "Information Technology", 68.0),

  // International ADRs
  ASML: adr("ASML", "ASML Holding N.V.", "Information Technology", 812.0),
  SAP: adr("SAP", "SAP SE", "Information Technology", 268.0),
  NVO: adr("NVO", "Novo Nordisk A/S", "Health Care", 58.0),
  TM: adr("TM", "Toyota Motor Corp.", "Consumer Discretionary", 192.0),
  AZN: adr("AZN", "AstraZeneca PLC", "Health Care", 78.0),
  SHEL: adr("SHEL", "Shell PLC", "Energy", 72.0),
  UL: adr("UL", "Unilever PLC", "Consumer Staples", 62.0),
  SONY: adr("SONY", "Sony Group Corp.", "Consumer Discretionary", 26.0),
  TSM: adr("TSM", "Taiwan Semiconductor Mfg.", "Information Technology", 285.0, "EM"),

  // Municipal bonds (price per $1,000 par)
  "NYCTFA-34": muni("NYC TFA 5.00% 2034", "New York City Transitional Finance Authority 5.00% 11/01/2034", 1045.0),
  "DASNY-36": muni("DASNY 4.00% 2036", "Dormitory Authority of the State of New York 4.00% 03/15/2036", 1012.0),
  "PANYNJ-33": muni("PANYNJ 5.00% 2033", "Port Authority of New York & New Jersey 5.00% 09/01/2033", 1058.0),
  "NJTPK-35": muni("NJ Tpk 5.00% 2035", "New Jersey Turnpike Authority 5.00% 01/01/2035", 1041.0),
  "MTAHY-38": muni("MTA HY 4.00% 2038", "MTA Hudson Rail Yards Trust 4.00% 11/15/2038", 976.0),
  "NYSTWY-32": muni("NYS Thwy 5.00% 2032", "New York State Thruway Authority 5.00% 01/01/2032", 1061.0),

  // Funds
  VOO: etf("VOO", "Vanguard S&P 500 ETF", "US_LARGE", 610.0, "Efficient", [
    { securityId: "NVDA", weight: 0.072 },
    { securityId: "AAPL", weight: 0.07 },
    { securityId: "MSFT", weight: 0.065 },
    { securityId: "AMZN", weight: 0.039 },
    { securityId: "META", weight: 0.029 },
    { securityId: "AVGO", weight: 0.025 },
    { securityId: "GOOGL", weight: 0.021 },
    { securityId: "BRK.B", weight: 0.017 },
    { securityId: "JPM", weight: 0.015 },
    { securityId: "LLY", weight: 0.012 },
  ]),
  QQQ: etf("QQQ", "Invesco QQQ Trust", "US_LARGE", 595.0, "Efficient", [
    { securityId: "NVDA", weight: 0.095 },
    { securityId: "AAPL", weight: 0.087 },
    { securityId: "MSFT", weight: 0.081 },
    { securityId: "AMZN", weight: 0.055 },
    { securityId: "AVGO", weight: 0.052 },
    { securityId: "META", weight: 0.038 },
    { securityId: "GOOGL", weight: 0.029 },
    { securityId: "COST", weight: 0.025 },
  ]),
  IJH: etf("IJH", "iShares Core S&P Mid-Cap ETF", "US_SMID", 64.0, "Efficient"),
  VB: etf("VB", "Vanguard Small-Cap ETF", "US_SMID", 248.0, "Efficient"),
  VEA: etf("VEA", "Vanguard FTSE Developed Markets ETF", "INTL_DEV", 58.0, "Efficient"),
  IEFA: etf("IEFA", "iShares Core MSCI EAFE ETF", "INTL_DEV", 85.0, "Efficient"),
  VWO: etf("VWO", "Vanguard FTSE Emerging Markets ETF", "EM", 52.0, "Efficient", [
    { securityId: "TSM", weight: 0.09 },
  ]),
  IEMG: etf("IEMG", "iShares Core MSCI Emerging Markets ETF", "EM", 63.0, "Efficient", [
    { securityId: "TSM", weight: 0.1 },
  ]),
  AGG: etf("AGG", "iShares Core U.S. Aggregate Bond ETF", "CORE_BOND", 99.0, "Inefficient"),
  BND: etf("BND", "Vanguard Total Bond Market ETF", "CORE_BOND", 74.0, "Inefficient"),
  IUSB: etf("IUSB", "iShares Core Total USD Bond Market ETF", "CORE_BOND", 46.5, "Inefficient"),
  VTEB: etf("VTEB", "Vanguard Tax-Exempt Bond ETF", "MUNI", 50.0, "Exempt"),
  XLV: etf("XLV", "Health Care Select Sector SPDR Fund", "US_LARGE", 146.0, "Efficient"),
  XLP: etf("XLP", "Consumer Staples Select Sector SPDR Fund", "US_LARGE", 81.0, "Efficient"),
};

export const SECURITIES: Record<string, Security> = Object.fromEntries(
  Object.entries(raw).map(([id, s]) => [id, { id, ...s }]),
);

export const ASSET_CLASSES: { id: AssetClassId; label: string; short: string }[] = [
  { id: "US_LARGE", label: "US large cap equity", short: "US large cap" },
  { id: "US_SMID", label: "US small & mid cap equity", short: "US small & mid" },
  { id: "INTL_DEV", label: "International developed equity", short: "Intl developed" },
  { id: "EM", label: "Emerging markets equity", short: "Emerging markets" },
  { id: "CORE_BOND", label: "Taxable core bonds", short: "Taxable bonds" },
  { id: "MUNI", label: "Municipal bonds", short: "Municipal bonds" },
  { id: "CASH", label: "Cash", short: "Cash" },
];

export const assetClassLabel = (id: AssetClassId) => ASSET_CLASSES.find((a) => a.id === id)!.label;
export const assetClassShort = (id: AssetClassId) => ASSET_CLASSES.find((a) => a.id === id)!.short;

/**
 * Tax-loss harvest replacements: a security that keeps market exposure but
 * is not substantially identical to the one sold. Also used when the wash-sale
 * guard has to swap a proposed purchase.
 */
export const REPLACEMENTS: Record<string, string> = {
  NVO: "IEFA",
  MRK: "XLV",
  PEP: "XLP",
  UNH: "XLV",
  AGG: "IUSB",
  BND: "IUSB",
  VWO: "IEMG",
  IEMG: "VWO",
};
