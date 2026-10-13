/**
 * Unified Wealth View — core data model.
 *
 * The model is deliberately person-first:
 *
 *   Household ─┬─ Members (people)
 *              ├─ Policy (target allocation, gain budget, concentration limit)
 *              └─ Accounts (registration, tax treatment, program: SWP / AAP)
 *                   └─ Sleeves (SMA or fund sub-accounts, each with a discretion holder)
 *                        └─ Tax lots ──► Security master (one record per security)
 *
 * Every holding resolves to a single security record, and funds carry their
 * look-through constituents. That is what lets the system recognize that the
 * Apple in one SMA sleeve, the Apple in a spouse's SMA sleeve and the Apple
 * inside two index ETFs are the same economic exposure for the same person.
 */

export type AssetClassId =
  | "US_LARGE"
  | "US_SMID"
  | "INTL_DEV"
  | "EM"
  | "CORE_BOND"
  | "MUNI"
  | "CASH";

export type SecurityType = "Stock" | "ADR" | "ETF" | "Municipal bond";

/** How tax-efficient a security is to hold in a taxable account. */
export type TaxProfile = "Efficient" | "Inefficient" | "Exempt";

export interface LookThroughHolding {
  securityId: string;
  /** Weight of the constituent inside the fund, 0–1. */
  weight: number;
}

export interface Security {
  id: string;
  ticker: string;
  name: string;
  type: SecurityType;
  assetClass: AssetClassId;
  sector?: string;
  /** Price per unit. Municipal bonds are quoted per $1,000 par. */
  price: number;
  taxProfile: TaxProfile;
  /** Published top holdings for funds (sample weights). */
  lookThrough?: LookThroughHolding[];
}

export interface TaxLot {
  id: string;
  securityId: string;
  quantity: number;
  unitCost: number;
  /** ISO date the lot was acquired. */
  acquired: string;
}

export type SleeveKind = "SMA" | "Funds";

/**
 * Who holds trading discretion over a sleeve, per the program rules in the
 * UBS Form ADV (SWP / AAP section, pp. 37–38):
 *  - OVERLAY:      Model Delivery SMA sub-accounts, traded by the overlay manager (UBS AM)
 *  - SMA_MANAGER:  Manager-traded SMA sub-accounts (e.g. fixed income)
 *  - FA:           AAP mutual fund / ETF sub-accounts (Financial Advisor discretion)
 *  - CLIENT:       SWP mutual fund / ETF sub-accounts (client authorizes each trade)
 */
export type Authority = "OVERLAY" | "SMA_MANAGER" | "FA" | "CLIENT";

export interface Sleeve {
  id: string;
  accountId: string;
  name: string;
  kind: SleeveKind;
  /** Strategy description shown to the advisor. */
  strategy: string;
  /** Manager or implementer of record. */
  manager: string;
  structure: "Model Delivery" | "Manager Traded" | "Advisor directed" | "Client directed";
  authority: Authority;
  lots: TaxLot[];
  cash: number;
}

export type Registration = "Joint (JTWROS)" | "Individual" | "Traditional IRA" | "Roth IRA";
export type TaxTreatment = "Taxable" | "Tax-deferred" | "Tax-free";
export type Program = "AAP" | "SWP";

export interface Account {
  id: string;
  name: string;
  owners: string[];
  registration: Registration;
  taxTreatment: TaxTreatment;
  program: Program;
  /** Masked account number. */
  number: string;
  sleeves: Sleeve[];
}

export interface Member {
  id: string;
  name: string;
  firstName: string;
  age: number;
}

export interface RealizedGain {
  date: string;
  accountId: string;
  sleeveId: string;
  securityId: string;
  term: "ST" | "LT";
  amount: number;
}

export interface HouseholdPolicy {
  /** Person-level target allocation, as fractions summing to 1. */
  target: Record<AssetClassId, number>;
  /** Tolerance before an asset class is flagged as drifted (fraction). */
  driftBand: number;
  /** Calendar-year realized gain budget, taxable accounts only. */
  gainBudget: { ST: number; LT: number };
  /** Maximum household exposure to a single issuer, direct + look-through. */
  concentrationLimit: number;
  /** Marginal rates used for estimates (federal incl. NIIT). */
  taxRates: { ST: number; LT: number };
  /** Minimum unrealized loss for a lot to be a harvest candidate. */
  harvestMinLoss: number;
}

export interface Household {
  id: string;
  name: string;
  members: Member[];
  advisor: { name: string; title: string };
  /** Valuation and analysis date. */
  asOf: string;
  policy: HouseholdPolicy;
  accounts: Account[];
  realizedYTD: RealizedGain[];
}
