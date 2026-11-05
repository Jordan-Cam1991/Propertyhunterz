/**
 * Financial Calculation Engine for Property Hunter (Queensland, Australia)
 * Implements exact formulas matching Jordan & Emma's spreadsheet.
 */

const Calculator = {
  /**
   * Queensland Transfer Duty (Stamp Duty) for Principal Place of Residence (Home Concession)
   * QLD Revenue Office transfer duty home concession rates:
   * Up to $350k: 1.0%
   * $350k - $540k: $3,500 + 3.5% of excess over $350,000
   * $540k - $1,000,000: $10,150 + 4.5% of excess over $540,000
   * Over $1,000,000: $30,850 + 5.75% of excess over $1,000,000
   */
  calculateStampDuty(purchasePrice, hasHomeConcession = true) {
    const price = Math.max(0, Number(purchasePrice) || 0);
    if (price === 0) return 0;

    if (hasHomeConcession) {
      if (price <= 350000) {
        return Math.round(price * 0.01);
      } else if (price <= 540000) {
        return Math.round(3500 + (price - 350000) * 0.035);
      } else if (price <= 1000000) {
        return Math.round(10150 + (price - 540000) * 0.045);
      } else {
        return Math.round(30850 + (price - 1000000) * 0.0575);
      }
    } else {
      // General transfer duty rates
      if (price <= 5000) return 0;
      if (price <= 75000) return Math.round((price - 5000) * 0.015);
      if (price <= 540000) return Math.round(1050 + (price - 75000) * 0.035);
      if (price <= 1000000) return Math.round(17325 + (price - 540000) * 0.045);
      return Math.round(38025 + (price - 1000000) * 0.0575);
    }
  },

  calculateQldTransferDuty(purchasePrice, hasHomeConcession = true) {
    return this.calculateStampDuty(purchasePrice, hasHomeConcession);
  },

  calculateMonthlyRepayment(loanAmount, annualInterestRate = 6.2, loanTermYears = 30) {
    return this.calculateMonthlyMortgage(loanAmount, annualInterestRate, loanTermYears);
  },

  /**
   * Calculate Net Equity released from current home sale
   */
  calculateSaleEquity(salePrice, existingMortgage, sellingExpenses) {
    const sale = Number(salePrice) || 0;
    const mortgage = Number(existingMortgage) || 0;
    const expenses = Number(sellingExpenses) || 0;
    return Math.max(0, sale - mortgage - expenses);
  },

  /**
   * Monthly Principal & Interest Loan Repayment
   * M = P * [ r(1 + r)^n ] / [ (1 + r)^n – 1]
   */
  calculateMonthlyMortgage(loanAmount, annualInterestRate = 6.2, loanTermYears = 30) {
    const principal = Math.max(0, Number(loanAmount) || 0);
    if (principal === 0) return 0;

    const monthlyRate = (annualInterestRate / 100) / 12;
    const numberOfPayments = loanTermYears * 12;

    if (monthlyRate === 0) return Math.round(principal / numberOfPayments);

    const factor = Math.pow(1 + monthlyRate, numberOfPayments);
    const monthlyPayment = principal * ((monthlyRate * factor) / (factor - 1));
    return Math.round(monthlyPayment);
  },

  /**
   * Complete purchase & cashflow model for a target property
   */
  evaluatePropertyFinances(property, saleData, purchaseDefaults = {}) {
    const purchasePrice = Number(property.modelledPrice) || Number(property.price) || 0;
    const interestRate = Number(purchaseDefaults.defaultInterestRate || 6.2);
    const loanTerm = Number(purchaseDefaults.loanTermYears || 30);
    const otherExpenses = Number(property.otherExpenses || purchaseDefaults.otherBuyingExpenses || 4000);

    // Available equity from sale
    const availableEquity = this.calculateSaleEquity(
      saleData.estimatedSalePrice,
      saleData.existingMortgage,
      saleData.sellingExpenses
    );

    // Stamp duty (use manual override if specified in spreadsheet, else dynamic QLD formula)
    const stampDuty = property.stampDuty && property.stampDuty > 0 
      ? Number(property.stampDuty)
      : this.calculateStampDuty(purchasePrice, true);

    // New mortgage required
    const totalOutlay = purchasePrice + stampDuty + otherExpenses;
    const estimatedNewMortgage = Math.max(0, totalOutlay - availableEquity);

    // Monthly payments
    const monthlyMortgage = this.calculateMonthlyMortgage(estimatedNewMortgage, interestRate, loanTerm);
    
    // Body corporate (weekly, monthly, quarterly)
    let quarterlyBodyCorp = Number(property.quarterlyBodyCorp) || 0;
    let monthlyBodyCorp = Number(property.monthlyBodyCorp) || 0;
    let weeklyBodyCorp = Number(property.weeklyBodyCorp) || 0;

    if (quarterlyBodyCorp > 0) {
      monthlyBodyCorp = Math.round((quarterlyBodyCorp / 3) * 100) / 100;
      weeklyBodyCorp = Math.round((quarterlyBodyCorp / 13) * 100) / 100;
    } else if (monthlyBodyCorp > 0) {
      quarterlyBodyCorp = Math.round(monthlyBodyCorp * 3);
      weeklyBodyCorp = Math.round((monthlyBodyCorp / 4.333) * 100) / 100;
    } else if (weeklyBodyCorp > 0) {
      monthlyBodyCorp = Math.round((weeklyBodyCorp * 4.333) * 100) / 100;
      quarterlyBodyCorp = Math.round(weeklyBodyCorp * 13);
    }

    const monthlyTotal = Math.round((monthlyMortgage + monthlyBodyCorp) * 100) / 100;
    
    // Monthly savings vs current mortgage ($4,810)
    const currentMortgage = Number(saleData.currentMonthlyMortgage || 4810);
    const monthlySaving = Math.round((currentMortgage - monthlyTotal) * 100) / 100;

    // Total mortgage reduction
    const existingMortgage = Number(saleData.existingMortgage || 806992);
    const mortgageReduction = Math.max(0, existingMortgage - estimatedNewMortgage);

    return {
      purchasePrice,
      stampDuty,
      otherExpenses,
      availableEquity,
      estimatedNewMortgage,
      monthlyMortgage,
      weeklyBodyCorp,
      quarterlyBodyCorp,
      monthlyBodyCorp,
      monthlyTotal,
      currentMonthlyMortgage: currentMortgage,
      monthlySaving,
      mortgageReduction,
      annualSaving: Math.round(monthlySaving * 12)
    };
  },

  /**
   * Calculate mortgage payoff timeline in years and specific payoff month/year
   * Accounts for minimum principal payments plus extra savings directed to offset.
   */
  calculatePayoffTimeline(loanAmount, annualInterestRate = 6.2, loanTermYears = 30, monthlyOffsetSavings = 0, initialOffsetBalance = 0) {
    const principal = Math.max(0, Number(loanAmount) || 0);
    if (principal <= 0) {
      return {
        standardYears: 0,
        payoffYears: 0,
        payoffMonths: 0,
        payoffDateStr: "Debt Free",
        standardMonthlyPayment: 0,
        totalInterestPaid: 0,
        interestSaved: 0
      };
    }

    const monthlyRate = (annualInterestRate / 100) / 12;
    const nominalMonths = loanTermYears * 12;
    const standardMonthlyPayment = this.calculateMonthlyMortgage(principal, annualInterestRate, loanTermYears);
    const standardTotalInterest = Math.max(0, (standardMonthlyPayment * nominalMonths) - principal);

    const monthlyExtra = Math.max(0, Number(monthlyOffsetSavings) || 0);
    const startBuffer = Math.max(0, Number(initialOffsetBalance) || 0);

    let balance = principal;
    let offsetAcc = startBuffer;
    let totalInterestPaid = 0;
    let months = 0;
    const maxMonths = 360;

    while (balance > 0.01 && months < maxMonths) {
      months++;
      offsetAcc += monthlyExtra;
      const effectiveDebt = Math.max(0, balance - offsetAcc);
      
      if (effectiveDebt <= 0) {
        break;
      }
      
      const interestForMonth = effectiveDebt * monthlyRate;
      totalInterestPaid += interestForMonth;
      
      const principalPayment = Math.min(balance, standardMonthlyPayment - interestForMonth);
      balance -= Math.max(0, principalPayment);
      
      if (balance <= offsetAcc) {
        break;
      }
    }

    const payoffYears = (months / 12).toFixed(1);
    
    // Calculate calendar payoff date (starting from current date)
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth();
    const targetDate = new Date(curYear, curMonth + months, 1);
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const payoffDateStr = `${monthNames[targetDate.getMonth()]} ${targetDate.getFullYear()}`;
    const interestSaved = Math.max(0, standardTotalInterest - totalInterestPaid);

    return {
      standardYears: loanTermYears,
      payoffYears: Number(payoffYears),
      payoffMonths: months,
      payoffDateStr,
      standardMonthlyPayment,
      totalInterestPaid: Math.round(totalInterestPaid),
      interestSaved: Math.round(interestSaved)
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calculator;
}
