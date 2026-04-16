/**
 * Centralized financial calculations for the Negocios app.
 *
 * Single source of truth for all project financial computations.
 * Used by API routes to compute derived fields before sending to the client.
 */

/** Safely convert a nullable/undefined number to a finite number, defaulting to 0 */
export const safe = (n: number | null | undefined): number => {
  if (n == null || isNaN(n) || !isFinite(n)) return 0;
  return n;
};

export interface ProjectFinancials {
  totalCosts: number;
  totalExpenses: number;
  investment: number;
  result: number;
  margin: number;
  estimatedMargin: number;
}

/**
 * Compute all derived financial fields for a project.
 *
 * @param project - Must have buyPrice, salePrice, listingPrice fields
 * @param costs - Array of cost records (supports multi-currency via amountUsd)
 * @param expenses - Array of expense records (supports multi-currency via amountUsd)
 */
export function computeProjectFinancials(
  project: { buyPrice: number | null; salePrice: number | null; listingPrice: number | null },
  costs: { amount: number; currency?: string | null; amountUsd?: number | null }[],
  expenses?: { amount: number; currency?: string | null; amountUsd?: number | null }[]
): ProjectFinancials {
  const bp = safe(project.buyPrice);

  // Costs: usar amountUsd si es ARS con conversion, sino amount directo (USD)
  const totalCosts = costs.reduce((sum, cost) => {
    if (cost.currency === "ARS" && cost.amountUsd != null) {
      return sum + safe(cost.amountUsd);
    }
    return sum + safe(cost.amount);
  }, 0);

  // Expenses: misma logica de conversion
  const expenseList = expenses || [];
  const totalExpenses = expenseList.reduce((sum, exp) => {
    if (exp.currency === "ARS" && exp.amountUsd != null) {
      return sum + safe(exp.amountUsd);
    }
    return sum + safe(exp.amount);
  }, 0);

  const investment = bp + totalCosts + totalExpenses;
  const sp = safe(project.salePrice);
  const lp = safe(project.listingPrice);
  const result = sp > 0 ? sp - investment : 0;
  const margin = sp > 0 && investment > 0 ? (result / investment) * 100 : 0;
  const estimatedMargin =
    lp > 0 && investment > 0 ? ((lp - investment) / investment) * 100 : 0;

  return { totalCosts, totalExpenses, investment, result, margin, estimatedMargin };
}
