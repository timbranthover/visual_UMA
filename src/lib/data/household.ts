import type { Account, Authority, Household, Sleeve, TaxLot } from "../types";

/**
 * Sample household: the Whitfields (fictional). Four accounts across SWP and
 * AAP, nine sleeves, individual tax lots. Structured the way SWP / AAP accounts
 * are structured today (single account, sub-accounts by strategy), with the
 * future-state assumption that every sleeve's lots are visible to UBS systems.
 */

let lotSeq = 0;
const lot = (securityId: string, quantity: number, unitCost: number, acquired: string): TaxLot => ({
  id: `L${String(++lotSeq).padStart(3, "0")}`,
  securityId,
  quantity,
  unitCost,
  acquired,
});

const sleeve = (
  id: string,
  accountId: string,
  name: string,
  kind: Sleeve["kind"],
  strategy: string,
  manager: string,
  structure: Sleeve["structure"],
  authority: Authority,
  cash: number,
  lots: TaxLot[],
): Sleeve => ({ id, accountId, name, kind, strategy, manager, structure, authority, cash, lots });

const joint: Account = {
  id: "A1",
  name: "Whitfield Joint",
  owners: ["M1", "M2"],
  registration: "Joint (JTWROS)",
  taxTreatment: "Taxable",
  program: "AAP",
  number: "••• 4821",
  sleeves: [
    sleeve("S1", "A1", "US Large Cap Growth", "SMA", "Concentrated US growth equity", "Model manager · UBS AM overlay", "Model Delivery", "OVERLAY", 22_400, [
      lot("AAPL", 1800, 38.5, "2016-03-14"),
      lot("AAPL", 1100, 142.1, "2021-11-02"),
      lot("MSFT", 800, 212.0, "2020-08-18"),
      lot("NVDA", 2300, 26.0, "2019-05-20"),
      lot("AMZN", 1500, 155.0, "2021-03-01"),
      lot("GOOGL", 1100, 98.0, "2022-10-11"),
      lot("META", 290, 330.0, "2023-02-06"),
      lot("AVGO", 600, 92.0, "2022-06-13"),
      lot("LLY", 180, 580.0, "2024-01-22"),
      lot("V", 400, 205.0, "2021-09-27"),
      lot("COST", 120, 590.0, "2023-05-08"),
    ]),
    sleeve("S2", "A1", "US Large Cap Value", "SMA", "US value equity", "Model manager · UBS AM overlay", "Model Delivery", "OVERLAY", 15_100, [
      lot("JPM", 1300, 138.0, "2021-01-19"),
      lot("BRK.B", 500, 330.0, "2023-03-20"),
      lot("JNJ", 1000, 162.0, "2022-04-04"),
      lot("XOM", 1500, 88.0, "2022-02-14"),
      lot("UNH", 350, 560.0, "2024-04-15"),
      lot("PG", 900, 141.0, "2021-12-06"),
      lot("MRK", 1200, 124.0, "2024-05-20"),
      lot("CVX", 700, 150.0, "2023-01-09"),
      lot("PEP", 700, 168.0, "2023-04-24"),
      lot("HD", 250, 290.0, "2022-09-26"),
    ]),
    sleeve("S3", "A1", "International ADR", "SMA", "Developed-market ADR equity", "Model manager · UBS AM overlay", "Model Delivery", "OVERLAY", 10_300, [
      lot("ASML", 260, 610.0, "2022-11-07"),
      lot("SAP", 700, 140.0, "2023-06-12"),
      lot("NVO", 2100, 128.0, "2024-06-10"),
      lot("TM", 700, 165.0, "2023-08-14"),
      lot("AZN", 1600, 70.0, "2023-10-02"),
      lot("SHEL", 1800, 66.0, "2023-03-06"),
      lot("UL", 1700, 58.0, "2022-12-12"),
      lot("SONY", 4200, 19.0, "2022-10-17"),
      lot("TSM", 450, 110.0, "2023-05-15"),
    ]),
    sleeve("S4", "A1", "Intermediate Municipal", "SMA", "NY / NJ intermediate municipal bonds", "Fixed income SMA manager", "Manager Traded", "SMA_MANAGER", 18_200, [
      lot("NYCTFA-34", 400, 1062.0, "2023-02-21"),
      lot("DASNY-36", 350, 1004.0, "2023-09-11"),
      lot("PANYNJ-33", 300, 1071.0, "2022-08-15"),
      lot("NJTPK-35", 300, 1049.0, "2024-01-08"),
      lot("MTAHY-38", 250, 958.0, "2023-11-13"),
      lot("NYSTWY-32", 300, 1080.0, "2022-05-02"),
    ]),
    sleeve("S5", "A1", "Funds & ETFs", "Funds", "Advisor-selected funds and ETFs", "Financial Advisor", "Advisor directed", "FA", 16_400, [
      lot("VOO", 1500, 380.0, "2021-06-07"),
      lot("AGG", 6200, 101.5, "2025-12-01"),
      lot("VWO", 1600, 61.8, "2025-11-18"),
    ]),
  ],
};

const claire: Account = {
  id: "A2",
  name: "Claire Individual",
  owners: ["M2"],
  registration: "Individual",
  taxTreatment: "Taxable",
  program: "SWP",
  number: "••• 7356",
  sleeves: [
    sleeve("S6", "A2", "US Dividend Equity", "SMA", "US dividend growth equity", "Model manager · UBS AM overlay", "Model Delivery", "OVERLAY", 12_800, [
      lot("AAPL", 800, 182.0, "2023-07-20"),
      lot("AAPL", 1000, 228.0, "2025-02-10"),
      lot("MSFT", 300, 410.0, "2024-03-18"),
      lot("JNJ", 700, 155.0, "2023-01-23"),
      lot("PG", 800, 150.0, "2023-09-05"),
      lot("KO", 2600, 58.0, "2023-02-27"),
      lot("PEP", 900, 150.0, "2024-08-12"),
      lot("ABBV", 800, 160.0, "2023-11-20"),
      lot("CSCO", 2500, 48.0, "2023-04-10"),
      lot("HD", 350, 330.0, "2023-10-16"),
      lot("UNH", 180, 452.0, "2025-03-03"),
      lot("UNH", 120, 301.0, "2026-09-24"),
      lot("JPM", 500, 190.0, "2024-02-05"),
      lot("XOM", 1200, 104.0, "2024-06-24"),
    ]),
    sleeve("S7", "A2", "Funds & ETFs", "Funds", "Client-authorized funds and ETFs", "Client directed", "Client directed", "CLIENT", 5_900, [
      lot("VEA", 3500, 47.0, "2023-08-28"),
      lot("VTEB", 6000, 49.6, "2024-10-07"),
    ]),
  ],
};

const danielIra: Account = {
  id: "A3",
  name: "Daniel Traditional IRA",
  owners: ["M1"],
  registration: "Traditional IRA",
  taxTreatment: "Tax-deferred",
  program: "AAP",
  number: "••• 1190",
  sleeves: [
    sleeve("S8", "A3", "Funds & ETFs", "Funds", "Advisor-selected funds and ETFs", "Financial Advisor", "Advisor directed", "FA", 38_600, [
      lot("VOO", 3000, 300.0, "2020-11-16"),
      lot("IJH", 9000, 52.0, "2021-04-12"),
      lot("VEA", 7000, 44.0, "2021-04-12"),
      lot("BND", 9500, 73.0, "2023-07-10"),
      lot("VWO", 5000, 41.0, "2021-04-12"),
    ]),
  ],
};

const claireRoth: Account = {
  id: "A4",
  name: "Claire Roth IRA",
  owners: ["M2"],
  registration: "Roth IRA",
  taxTreatment: "Tax-free",
  program: "SWP",
  number: "••• 6604",
  sleeves: [
    sleeve("S9", "A4", "Funds & ETFs", "Funds", "Client-authorized funds and ETFs", "Client directed", "Client directed", "CLIENT", 9_700, [
      lot("QQQ", 1300, 300.0, "2020-12-14"),
      lot("VB", 1500, 180.0, "2021-12-13"),
      lot("IEMG", 3600, 52.0, "2022-03-07"),
      lot("VWO", 1000, 44.0, "2022-03-07"),
      lot("VWO", 200, 51.4, "2026-10-01"),
    ]),
  ],
};

export const HOUSEHOLD: Household = {
  id: "H1",
  name: "Whitfield Household",
  members: [
    { id: "M1", name: "Daniel Whitfield", firstName: "Daniel", age: 61 },
    { id: "M2", name: "Claire Whitfield", firstName: "Claire", age: 58 },
  ],
  advisor: { name: "Elena Marsh", title: "Wealth Management Advisor" },
  asOf: "2026-10-13",
  policy: {
    target: {
      US_LARGE: 0.5,
      US_SMID: 0.06,
      INTL_DEV: 0.13,
      EM: 0.04,
      CORE_BOND: 0.1,
      MUNI: 0.15,
      CASH: 0.02,
    },
    driftBand: 0.03,
    gainBudget: { ST: 20_000, LT: 150_000 },
    concentrationLimit: 0.05,
    taxRates: { ST: 0.408, LT: 0.238 },
    harvestMinLoss: 10_000,
  },
  accounts: [joint, claire, danielIra, claireRoth],
  realizedYTD: [
    { date: "2026-02-17", accountId: "A1", sleeveId: "S1", securityId: "NVDA", term: "LT", amount: 41_200 },
    { date: "2026-05-11", accountId: "A2", sleeveId: "S6", securityId: "CSCO", term: "ST", amount: 8_100 },
    { date: "2026-06-22", accountId: "A1", sleeveId: "S2", securityId: "JPM", term: "LT", amount: 33_500 },
    { date: "2026-08-03", accountId: "A1", sleeveId: "S4", securityId: "PANYNJ-33", term: "LT", amount: 3_100 },
    { date: "2026-09-14", accountId: "A1", sleeveId: "S1", securityId: "META", term: "LT", amount: 18_200 },
  ],
};
