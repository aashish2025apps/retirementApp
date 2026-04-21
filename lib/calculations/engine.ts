import type {
  ScenarioData,
  YearlyProjection,
  ProjectionResult,
} from "@/lib/types";

const IRS_401K_LIMIT = 23000;
const IRS_401K_CATCHUP = 7500; // age 50+
const IRS_ROTH_LIMIT = 7000;
const IRS_ROTH_CATCHUP = 1000;
const IRS_IRA_LIMIT = 7000;

const SS_FRA = 67;
const SS_COLA = 0.025;

// 2024 tax brackets (inflation-indexed at TAX_INFLATION per year)
const TAX_INFLATION = 0.02;
const TAX_BRACKETS = {
  married: [
    { rate: 10, top: 23200 },
    { rate: 12, top: 94300 },
    { rate: 22, top: 201050 },
    { rate: 24, top: 383900 },
    { rate: 32, top: 487450 },
  ],
  single: [
    { rate: 10, top: 11600 },
    { rate: 12, top: 47150 },
    { rate: 22, top: 100525 },
    { rate: 24, top: 191950 },
    { rate: 32, top: 243725 },
  ],
};
const STD_DEDUCTIONS = { married: 29200, single: 14600 };

// IRS Uniform Lifetime Table (SECURE 2.0, effective 2023)
const RMD_FACTORS: Record<number, number> = {
  73: 26.5, 74: 25.5, 75: 24.6, 76: 23.7, 77: 22.9,
  78: 22.0, 79: 21.1, 80: 20.2, 81: 19.4, 82: 18.5,
  83: 17.7, 84: 16.8, 85: 16.0, 86: 15.2, 87: 14.4,
  88: 13.7, 89: 12.9, 90: 12.2, 91: 11.5, 92: 10.8,
  93: 10.1, 94: 9.5, 95: 8.9,  96: 8.4,  97: 7.8,
  98: 7.3,  99: 6.8,  100: 6.4,
};

function getBrackets(filingStatus: string, yearsFromNow: number) {
  const base = filingStatus === "married" ? TAX_BRACKETS.married : TAX_BRACKETS.single;
  const f = Math.pow(1 + TAX_INFLATION, yearsFromNow);
  return base.map((b) => ({ rate: b.rate, top: b.top * f }));
}

function getStdDeduction(filingStatus: string, yearsFromNow: number): number {
  const base = filingStatus === "married" ? STD_DEDUCTIONS.married : STD_DEDUCTIONS.single;
  return base * Math.pow(1 + TAX_INFLATION, yearsFromNow);
}

function getMarginalRate(
  existingTaxableIncome: number,
  addedIncome: number,
  filingStatus: string,
  yearsFromNow: number
): number {
  const brackets = getBrackets(filingStatus, yearsFromNow);
  const midpoint = existingTaxableIncome + addedIncome / 2;
  for (const b of brackets) {
    if (midpoint <= b.top) return b.rate / 100;
  }
  return 0.37;
}

const COLLEGE_COSTS: Record<string, number> = {
  "public-in-state": 28000,
  "public-out-of-state": 45000,
  private: 65000,
};
const EDUCATION_INFLATION = 0.05;
const RETURN_529 = 0.06;

function amortizeDebtYear(balance: number, annualRatePct: number, monthlyPayment: number): number {
  if (balance <= 0) return 0;
  let b = balance;
  for (let m = 0; m < 12; m++) {
    const interest = b * (annualRatePct / 100 / 12);
    const principal = Math.min(monthlyPayment - interest, b);
    if (principal <= 0) break;
    b -= principal;
  }
  return Math.max(0, b);
}

function getAdjustedAnnualSsBenefit(monthlyAtFRA: number, claimingAge: number): number {
  const monthsDiff = Math.round((claimingAge - SS_FRA) * 12);
  let factor: number;
  if (monthsDiff >= 0) {
    // Delayed credits: 8% per year, capped at age 70
    factor = 1 + Math.min(monthsDiff / 12, 3) * 0.08;
  } else {
    const earlyMonths = Math.abs(monthsDiff);
    const first36 = Math.min(earlyMonths, 36);
    const remaining = Math.max(0, earlyMonths - 36);
    factor = 1 - (first36 * (5 / 900) + remaining * (5 / 1200));
  }
  return monthlyAtFRA * 12 * factor;
}

function getReturnRate(
  stockAlloc: number,
  stockRate: number,
  bondRate: number
): number {
  const bondAlloc = 1 - stockAlloc / 100;
  return (stockAlloc / 100) * (stockRate / 100) + bondAlloc * (bondRate / 100);
}

function getGlidePathAllocation(
  age: number,
  retirementAge: number,
  baseAllocation: number
): number {
  if (age >= retirementAge + 20) return Math.max(30, baseAllocation - 30);
  if (age >= retirementAge) return Math.max(40, baseAllocation - 20);
  return baseAllocation;
}

export function runProjection(data: ScenarioData): ProjectionResult {
  const { profile, income, accounts, spending, assumptions, socialSecurity: ss, debts, education, rothConversion: rc, windfalls } = data;
  const projections: YearlyProjection[] = [];

  // Exchange fund positions (deferred-gain vehicles)
  type ExFundPos = { balance: number; costBasisDollars: number; exitAge: number; ltcgRatePct: number };
  const exFundPositions: ExFundPos[] = [];

  // Debt state
  let homeValue = debts?.hasMortgage ? debts.mortgage.homeValue : 0;
  let mortgageBalance = debts?.hasMortgage ? debts.mortgage.remainingBalance : 0;
  const otherDebtBalances = (debts?.otherDebts ?? []).map((d) => ({ ...d, remaining: d.balance }));

  // 529 state per child
  const balances529 = (education?.children ?? []).map((c) => ({ ...c, bal: c.balance529 }));

  let k401 = accounts.k401Balance;
  let roth = accounts.rothBalance;
  let ira = accounts.iraBalance;
  let taxable = accounts.taxableBalance;
  let hsa = accounts.hsaBalance;
  let spouseK401 = accounts.spouseK401Balance;
  let spouseRoth = accounts.spouseRothBalance;
  let spouseIra = accounts.spouseIraBalance;

  let salary = income.annualSalary;
  let spouseSalary = income.spouseAnnualSalary;

  const currentYear = new Date().getFullYear();
  let portfolioFailed = false;
  let shortfallAge: number | undefined;

  for (
    let age = profile.currentAge;
    age <= profile.lifeExpectancy;
    age++
  ) {
    const year = currentYear + (age - profile.currentAge);
    const isRetired = age >= profile.retirementAge;
    const stockAlloc = getGlidePathAllocation(
      age,
      profile.retirementAge,
      assumptions.stockAllocation
    );
    const returnRate = getReturnRate(
      stockAlloc,
      assumptions.stockReturnRate,
      assumptions.bondReturnRate
    );

    // Income
    const grossIncome = isRetired ? 0 : salary + spouseSalary + income.bonusAmount;
    const taxes = grossIncome * (assumptions.effectiveTaxRate / 100);
    const netIncome = grossIncome - taxes;

    // Contributions (pre-retirement)
    let totalContributions = 0;
    if (!isRetired) {
      const catchup = age >= 50 ? IRS_401K_CATCHUP : 0;
      const k401ContribActual = Math.min(
        accounts.k401Contribution,
        IRS_401K_LIMIT + catchup
      );
      const employerMatch = Math.min(
        salary * (accounts.employerMatchLimit / 100),
        salary * (accounts.employerMatchPercent / 100)
      );
      k401 += k401ContribActual + employerMatch;
      roth += Math.min(accounts.rothContribution, IRS_ROTH_LIMIT + (age >= 50 ? IRS_ROTH_CATCHUP : 0));
      ira += Math.min(accounts.iraContribution, IRS_IRA_LIMIT);
      taxable += accounts.taxableContribution;
      hsa += accounts.hsaContribution;
      spouseK401 += Math.min(accounts.spouseK401Contribution, IRS_401K_LIMIT + catchup);
      spouseRoth += Math.min(accounts.spouseRothContribution, IRS_ROTH_LIMIT + (age >= 50 ? IRS_ROTH_CATCHUP : 0));
      spouseIra += Math.min(accounts.spouseIraContribution, IRS_IRA_LIMIT);

      totalContributions = k401ContribActual + employerMatch +
        accounts.rothContribution + accounts.iraContribution +
        accounts.taxableContribution + accounts.hsaContribution;
    }

    // Grow accounts
    k401 *= 1 + returnRate;
    roth *= 1 + returnRate;
    ira *= 1 + returnRate;
    taxable *= 1 + returnRate;
    hsa *= 1 + returnRate;
    spouseK401 *= 1 + returnRate;
    spouseRoth *= 1 + returnRate;
    spouseIra *= 1 + returnRate;

    // Expenses & withdrawal
    const inflationFactor = Math.pow(
      1 + assumptions.inflationRate / 100,
      age - profile.currentAge
    );
    const annualExpenses = spending.monthlyBudget * 12 * inflationFactor;

    // Social Security income (COLA-adjusted)
    let annualSsIncome = 0;
    if (ss) {
      if (ss.monthlyBenefitAtFRA > 0 && age >= ss.claimingAge) {
        const baseAnnual = getAdjustedAnnualSsBenefit(ss.monthlyBenefitAtFRA, ss.claimingAge);
        annualSsIncome += baseAnnual * Math.pow(1 + SS_COLA, age - ss.claimingAge);
      }
      if (ss.hasSpouseBenefit && ss.spouseMonthlyBenefitAtFRA > 0 && age >= ss.spouseClaimingAge) {
        const baseAnnual = getAdjustedAnnualSsBenefit(ss.spouseMonthlyBenefitAtFRA, ss.spouseClaimingAge);
        annualSsIncome += baseAnnual * Math.pow(1 + SS_COLA, age - ss.spouseClaimingAge);
      }
    }

    // ── RMD (age 73+, SECURE 2.0) ───────────────────────────────────────────
    let rmdAmount = 0;
    if (age >= 73 && isRetired) {
      const tradTotal = k401 + ira + spouseK401 + spouseIra;
      const factor = RMD_FACTORS[Math.min(age, 100)] ?? 6.4;
      rmdAmount = tradTotal / factor;
      // If RMD exceeds net spending need, surplus becomes taxable savings
      const netSpending = Math.max(0, annualExpenses - annualSsIncome);
      if (rmdAmount > netSpending) {
        taxable += rmdAmount - netSpending;
      }
    }

    // ── Roth conversion ──────────────────────────────────────────────────────
    let rothConversionAmount = 0;
    let conversionTaxCost = 0;
    if (rc && rc.strategy !== "none" && isRetired && age >= rc.startAge && age <= rc.endAge) {
      const yearsFromNow = age - profile.currentAge;
      const tradTotal = k401 + ira + spouseK401 + spouseIra;
      let convAmount = 0;

      if (rc.strategy === "fixed-amount") {
        convAmount = Math.min(rc.fixedAnnualAmount, tradTotal);
      } else {
        // bracket-fill: fill up to target bracket
        const brackets = getBrackets(profile.filingStatus, yearsFromNow);
        const stdDed = getStdDeduction(profile.filingStatus, yearsFromNow);
        const targetBracket = brackets.find((b) => b.rate === rc.targetBracketRate);
        const bracketTop = targetBracket?.top ?? 94300;
        const ssOrdinary = annualSsIncome * 0.85;
        const existingTaxable = Math.max(0, ssOrdinary + rmdAmount - stdDed);
        const room = Math.max(0, bracketTop - existingTaxable);
        convAmount = Math.min(room, tradTotal);
      }

      if (convAmount > 0) {
        const yearsFromNow2 = age - profile.currentAge;
        const stdDed = getStdDeduction(profile.filingStatus, yearsFromNow2);
        const existingTaxable = Math.max(0, annualSsIncome * 0.85 + rmdAmount - stdDed);
        const marginalRate = getMarginalRate(existingTaxable, convAmount, profile.filingStatus, yearsFromNow2);
        const taxCost = convAmount * marginalRate;

        if (taxCost <= taxable) {
          taxable -= taxCost;
          const ratio = convAmount / (tradTotal || 1);
          k401 -= k401 * ratio;
          ira -= ira * ratio;
          spouseK401 -= spouseK401 * ratio;
          spouseIra -= spouseIra * ratio;
          roth += convAmount;
          rothConversionAmount = convAmount;
          conversionTaxCost = taxCost;
        }
      }
    }

    let withdrawal = 0;
    if (isRetired && !portfolioFailed) {
      const netNeeded = Math.max(0, annualExpenses - annualSsIncome);
      withdrawal = netNeeded;
      // Optimal withdrawal order: taxable → traditional → roth
      const totalPortfolio = taxable + k401 + ira + spouseK401 + spouseIra + roth + spouseRoth;
      if (totalPortfolio <= 0 && netNeeded > 0) {
        portfolioFailed = true;
        shortfallAge = age;
      } else if (netNeeded > 0) {
        const ratio = Math.min(1, netNeeded / totalPortfolio);
        taxable -= taxable * ratio;
        const traditionalTotal = k401 + ira + spouseK401 + spouseIra;
        const fromTraditional = Math.min(traditionalTotal * ratio, netNeeded - taxable * ratio);
        k401 -= k401 * (fromTraditional / (traditionalTotal || 1));
        ira -= ira * (fromTraditional / (traditionalTotal || 1));
        spouseK401 -= spouseK401 * (fromTraditional / (traditionalTotal || 1));
        spouseIra -= spouseIra * (fromTraditional / (traditionalTotal || 1));
      }
    }

    // ── Exchange fund: grow existing positions ───────────────────────────────
    for (const pos of exFundPositions) pos.balance *= 1 + returnRate;

    // ── Windfalls ────────────────────────────────────────────────────────────
    for (const w of windfalls?.items ?? []) {
      if (w.age !== age) continue;
      // Exchange fund — defer gains, grow separately, tax on exit
      if (w.exchangeFund.amount > 0) {
        const ef = w.exchangeFund;
        exFundPositions.push({
          balance: ef.amount,
          costBasisDollars: ef.amount * ef.costBasisPct / 100,
          exitAge: age + ef.lockupYears,
          ltcgRatePct: ef.ltcgRatePct,
        });
      }
      // Sell & diversify — pay LTCG now, invest after-tax proceeds
      if (w.sellDiversify.amount > 0) {
        const sd = w.sellDiversify;
        const gain = sd.amount * (1 - sd.costBasisPct / 100);
        const tax = gain * sd.ltcgRatePct / 100;
        const afterTax = sd.amount - tax;
        if (sd.targetAccount === "roth") roth += afterTax;
        else if (sd.targetAccount === "ira") ira += afterTax;
        else taxable += afterTax;
      }
      // Hold cash — no tax event, goes straight to taxable
      if (w.holdCash > 0) {
        taxable += w.holdCash;
      }
    }

    // Exchange fund exits (after this year's growth)
    for (let i = exFundPositions.length - 1; i >= 0; i--) {
      const pos = exFundPositions[i];
      if (pos.exitAge === age) {
        const gain = pos.balance - pos.costBasisDollars;
        const tax = Math.max(0, gain) * pos.ltcgRatePct / 100;
        taxable += pos.balance - tax;
        exFundPositions.splice(i, 1);
      }
    }

    const exchangeFundBalance = exFundPositions.reduce((s, p) => s + p.balance, 0);

    // ── Mortgage & home equity ──────────────────────────────────────────────
    let homeEquity = 0;
    if (debts?.hasMortgage) {
      homeValue *= 1 + debts.mortgage.homeAppreciationRate / 100;
      if (mortgageBalance > 0) {
        mortgageBalance = amortizeDebtYear(mortgageBalance, debts.mortgage.interestRate, debts.mortgage.monthlyPayment);
      }
      homeEquity = Math.max(0, homeValue - mortgageBalance);
    }

    // ── Other debts ─────────────────────────────────────────────────────────
    let totalDebtBalance = 0;
    for (const debt of otherDebtBalances) {
      debt.remaining = amortizeDebtYear(debt.remaining, debt.interestRate, debt.monthlyPayment);
      totalDebtBalance += debt.remaining;
    }

    // ── Education / 529 ─────────────────────────────────────────────────────
    let total529 = 0;
    for (const child of balances529) {
      const childAge = child.currentAge + (age - profile.currentAge);
      const inCollege = childAge >= child.collegeStartAge && childAge < child.collegeStartAge + child.yearsOfCollege;
      if (inCollege) {
        const yearsFromNow = age - profile.currentAge;
        const annualCost = (COLLEGE_COSTS[child.collegeType] ?? 30000) * Math.pow(1 + EDUCATION_INFLATION, yearsFromNow);
        const from529 = Math.min(child.bal, annualCost);
        child.bal = Math.max(0, child.bal - from529);
        const gap = annualCost - from529;
        if (isRetired) {
          withdrawal += gap; // adds to retirement portfolio draw
        } else {
          taxable = Math.max(0, taxable - gap);
        }
      } else if (childAge < child.collegeStartAge) {
        child.bal = child.bal * (1 + RETURN_529) + child.monthlyContribution529 * 12;
      }
      total529 += child.bal;
    }

    const totalAssets = Math.max(0, k401 + roth + ira + taxable + hsa + spouseK401 + spouseRoth + spouseIra);

    projections.push({
      age,
      year,
      k401Balance: Math.max(0, k401 + spouseK401),
      rothBalance: Math.max(0, roth + spouseRoth),
      iraBalance: Math.max(0, ira + spouseIra),
      taxableBalance: Math.max(0, taxable),
      hsaBalance: Math.max(0, hsa),
      totalAssets,
      netWorth: totalAssets + homeEquity + total529 + exchangeFundBalance - totalDebtBalance,
      homeEquity,
      balance529: total529,
      totalDebtBalance,
      exchangeFundBalance,
      grossIncome,
      taxes,
      netIncome,
      expenses: isRetired ? annualExpenses : annualExpenses * 0.9,
      savingsAdded: totalContributions,
      isRetired,
      withdrawal,
      ssIncome: annualSsIncome,
      rothConversionAmount,
      conversionTaxCost,
      rmdAmount,
      portfolioSurvived: !portfolioFailed,
    });

    // Apply raises
    if (!isRetired) {
      salary *= 1 + income.annualRaise / 100;
      spouseSalary *= 1 + income.spouseAnnualRaise / 100;
    }
  }

  const retirementProjection = projections.find(
    (p) => p.age === profile.retirementAge
  );
  const projectedRetirementAssets = retirementProjection?.totalAssets ?? 0;
  const annualRetirementIncome = spending.monthlyBudget * 12;
  const annualSsIncome = retirementProjection?.ssIncome ?? 0;
  const annualPortfolioWithdrawal = Math.max(0, annualRetirementIncome - annualSsIncome);
  const safeWithdrawalRate = projectedRetirementAssets > 0
    ? (annualPortfolioWithdrawal / projectedRetirementAssets) * 100
    : annualPortfolioWithdrawal > 0 ? 100 : 0;
  const yearsInRetirement = profile.lifeExpectancy - profile.retirementAge;

  // Readiness score: based on 4% rule applied to net portfolio need (spending minus SS)
  const targetNestEgg = annualPortfolioWithdrawal * 25;
  const fundingRatio = targetNestEgg > 0 ? projectedRetirementAssets / targetNestEgg : 1;
  const readinessScore = Math.round(Math.min(100, fundingRatio * 100));

  // Success rate heuristic based on safe withdrawal rate
  const successRate = safeWithdrawalRate <= 3 ? 97
    : safeWithdrawalRate <= 4 ? 91
    : safeWithdrawalRate <= 5 ? 82
    : safeWithdrawalRate <= 6 ? 70
    : safeWithdrawalRate <= 8 ? 55
    : 35;

  return {
    projections,
    readinessScore,
    successRate,
    retirementAge: profile.retirementAge,
    projectedRetirementAssets,
    annualRetirementIncome,
    annualSsIncome,
    yearsInRetirement,
    shortfallAge,
  };
}

export function getBlankScenarioData(): ScenarioData {
  return {
    profile: {
      currentAge: 0,
      retirementAge: 0,
      lifeExpectancy: 0,
      state: "",
      filingStatus: "single",
      hasSpouse: false,
    },
    income: {
      annualSalary: 0,
      annualRaise: 3,
      spouseAnnualSalary: 0,
      spouseAnnualRaise: 3,
      bonusAmount: 0,
    },
    accounts: {
      k401Balance: 0, rothBalance: 0, iraBalance: 0,
      taxableBalance: 0, hsaBalance: 0,
      spouseK401Balance: 0, spouseRothBalance: 0, spouseIraBalance: 0,
      k401Contribution: 0, rothContribution: 0, iraContribution: 0,
      taxableContribution: 0, hsaContribution: 0,
      spouseK401Contribution: 0, spouseRothContribution: 0, spouseIraContribution: 0,
      employerMatchPercent: 0, employerMatchLimit: 0,
    },
    spending: {
      monthlyBudget: 0,
      currentExpenses: {
        housing: 0, transportation: 0, food: 0, utilities: 0,
        insurance: 0, healthcare: 0, childcare: 0,
        entertainment: 0, travel: 0, other: 0,
      },
    },
    assumptions: {
      stockReturnRate: 7,
      bondReturnRate: 4,
      inflationRate: 3,
      stockAllocation: 80,
      effectiveTaxRate: 22,
    },
    debts: {
      hasMortgage: false,
      mortgage: { homeValue: 0, remainingBalance: 0, monthlyPayment: 0, interestRate: 6.5, remainingYears: 30, homeAppreciationRate: 3 },
      otherDebts: [],
    },
    education: { children: [] },
    socialSecurity: { monthlyBenefitAtFRA: 0, claimingAge: 67, hasSpouseBenefit: false, spouseMonthlyBenefitAtFRA: 0, spouseClaimingAge: 67 },
    windfalls: { items: [] as import("../types").Windfall[] },
    rothConversion: { strategy: "none", targetBracketRate: 22, fixedAnnualAmount: 0, startAge: 65, endAge: 72 },
  };
}

export function getDefaultScenarioData(): ScenarioData {
  return {
    profile: {
      currentAge: 35,
      retirementAge: 65,
      lifeExpectancy: 90,
      state: "CA",
      filingStatus: "married",
      hasSpouse: false,
      spouseAge: undefined,
      spouseRetirementAge: undefined,
    },
    income: {
      annualSalary: 100000,
      annualRaise: 3,
      spouseAnnualSalary: 0,
      spouseAnnualRaise: 3,
      bonusAmount: 0,
    },
    accounts: {
      k401Balance: 50000,
      rothBalance: 15000,
      iraBalance: 0,
      taxableBalance: 10000,
      hsaBalance: 5000,
      spouseK401Balance: 0,
      spouseRothBalance: 0,
      spouseIraBalance: 0,
      k401Contribution: 10000,
      rothContribution: 6000,
      iraContribution: 0,
      taxableContribution: 5000,
      hsaContribution: 3850,
      spouseK401Contribution: 0,
      spouseRothContribution: 0,
      spouseIraContribution: 0,
      employerMatchPercent: 50,
      employerMatchLimit: 6,
    },
    spending: {
      monthlyBudget: 5000,
      currentExpenses: {
        housing: 0,
        transportation: 0,
        food: 0,
        utilities: 0,
        insurance: 0,
        healthcare: 0,
        childcare: 0,
        entertainment: 0,
        travel: 0,
        other: 0,
      },
    },
    debts: {
      hasMortgage: false,
      mortgage: {
        homeValue: 0,
        remainingBalance: 0,
        monthlyPayment: 0,
        interestRate: 6.5,
        remainingYears: 30,
        homeAppreciationRate: 3,
      },
      otherDebts: [],
    },
    education: {
      children: [],
    },
    socialSecurity: {
      monthlyBenefitAtFRA: 0,
      claimingAge: 67,
      hasSpouseBenefit: false,
      spouseMonthlyBenefitAtFRA: 0,
      spouseClaimingAge: 67,
    },
    windfalls: { items: [] as import("../types").Windfall[] },
    rothConversion: {
      strategy: "none",
      targetBracketRate: 22,
      fixedAnnualAmount: 20000,
      startAge: 65,
      endAge: 72,
    },
    assumptions: {
      stockReturnRate: 7,
      bondReturnRate: 4,
      inflationRate: 3,
      stockAllocation: 80,
      effectiveTaxRate: 22,
    },
  };
}
