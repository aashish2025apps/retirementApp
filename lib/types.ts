export interface Profile {
  currentAge: number;
  retirementAge: number;
  lifeExpectancy: number;
  state: string;
  filingStatus: "single" | "married" | "hoh";
  hasSpouse: boolean;
  spouseAge?: number;
  spouseRetirementAge?: number;
}

export interface Income {
  annualSalary: number;
  annualRaise: number; // percent
  spouseAnnualSalary: number;
  spouseAnnualRaise: number;
  bonusAmount: number; // annual bonus
}

export interface Accounts {
  // Balances
  k401Balance: number;
  rothBalance: number;
  iraBalance: number;
  taxableBalance: number;
  hsaBalance: number;
  spouseK401Balance: number;
  spouseRothBalance: number;
  spouseIraBalance: number;
  // Annual contributions
  k401Contribution: number;
  rothContribution: number;
  iraContribution: number;
  taxableContribution: number;
  hsaContribution: number;
  spouseK401Contribution: number;
  spouseRothContribution: number;
  spouseIraContribution: number;
  // Employer match
  employerMatchPercent: number;
  employerMatchLimit: number; // % of salary employer matches up to
}

export interface CurrentExpenses {
  housing: number;
  transportation: number;
  food: number;
  utilities: number;
  insurance: number;
  healthcare: number;
  childcare: number;
  entertainment: number;
  travel: number;
  other: number;
}

export interface Spending {
  monthlyBudget: number; // retirement spending in today's dollars
  currentExpenses: CurrentExpenses;
}

export interface Assumptions {
  stockReturnRate: number; // annual %, e.g. 7
  bondReturnRate: number; // annual %, e.g. 4
  inflationRate: number; // annual %, e.g. 3
  stockAllocation: number; // % in stocks, rest in bonds
  effectiveTaxRate: number; // % for simplified tax calc
}

export interface Mortgage {
  homeValue: number;
  remainingBalance: number;
  monthlyPayment: number;
  interestRate: number;
  remainingYears: number;
  homeAppreciationRate: number;
}

export interface OtherDebt {
  id: string;
  name: string;
  balance: number;
  monthlyPayment: number;
  interestRate: number;
}

export interface Debts {
  hasMortgage: boolean;
  mortgage: Mortgage;
  otherDebts: OtherDebt[];
}

export interface Child {
  id: string;
  name: string;
  currentAge: number;
  collegeStartAge: number;
  collegeType: "public-in-state" | "public-out-of-state" | "private";
  balance529: number;
  monthlyContribution529: number;
  yearsOfCollege: number;
}

export interface Education {
  children: Child[];
}

export type WindfallTargetAccount = "taxable" | "roth" | "ira";

export interface ExchangeFundAlloc {
  amount: number;
  costBasisPct: number;   // % of amount that is original basis
  ltcgRatePct: number;    // LTCG rate at exit
  lockupYears: number;    // years before exit / tax event
}

export interface SellDiversifyAlloc {
  amount: number;
  costBasisPct: number;
  ltcgRatePct: number;
  targetAccount: WindfallTargetAccount;
}

export interface Windfall {
  id: string;
  name: string;
  age: number;
  exchangeFund: ExchangeFundAlloc;
  sellDiversify: SellDiversifyAlloc;
  holdCash: number; // amount added to taxable immediately, no tax event
}

export interface Windfalls {
  items: Windfall[];
}

export type RothStrategyMode = "none" | "bracket-fill" | "fixed-amount";

export interface RothConversion {
  strategy: RothStrategyMode;
  targetBracketRate: 12 | 22 | 24;
  fixedAnnualAmount: number;
  startAge: number;
  endAge: number;
}

export interface SocialSecurity {
  monthlyBenefitAtFRA: number;
  claimingAge: number;
  hasSpouseBenefit: boolean;
  spouseMonthlyBenefitAtFRA: number;
  spouseClaimingAge: number;
}

export interface ScenarioData {
  profile: Profile;
  income: Income;
  accounts: Accounts;
  spending: Spending;
  assumptions: Assumptions;
  socialSecurity?: SocialSecurity;
  debts?: Debts;
  education?: Education;
  rothConversion?: RothConversion;
  windfalls?: Windfalls;
}

export interface YearlyProjection {
  age: number;
  year: number;
  // Balances
  k401Balance: number;
  rothBalance: number;
  iraBalance: number;
  taxableBalance: number;
  hsaBalance: number;
  // Totals
  totalAssets: number;
  netWorth: number;
  // Cash flows
  grossIncome: number;
  taxes: number;
  netIncome: number;
  expenses: number;
  savingsAdded: number;
  ssIncome: number;
  exchangeFundBalance: number;  // aggregate value of all open exchange fund positions
  rothConversionAmount: number;
  conversionTaxCost: number;
  rmdAmount: number;
  homeEquity: number;
  balance529: number;
  totalDebtBalance: number;
  // Retirement
  isRetired: boolean;
  withdrawal: number;
  portfolioSurvived: boolean;
}

export interface ProjectionResult {
  projections: YearlyProjection[];
  readinessScore: number; // 0-100
  successRate: number; // % chance portfolio survives to life expectancy
  retirementAge: number;
  projectedRetirementAssets: number;
  annualRetirementIncome: number; // total spending need
  annualSsIncome: number;         // SS income at retirement age
  yearsInRetirement: number;
  shortfallAge?: number; // age when portfolio runs out (if any)
}
