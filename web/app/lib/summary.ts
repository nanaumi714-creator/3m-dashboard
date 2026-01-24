import { Transaction } from "./mock-data";

export function buildSummary(transactions: Transaction[]) {
  const income = transactions
    .filter((tx) => tx.amountYen > 0)
    .reduce((sum, tx) => sum + tx.amountYen, 0);
  const expenses = transactions
    .filter((tx) => tx.amountYen < 0)
    .reduce((sum, tx) => sum + tx.amountYen, 0);
  const businessExpenses = transactions
    .filter((tx) => tx.amountYen < 0 && tx.isBusiness)
    .reduce(
      (sum, tx) => sum + (tx.amountYen * (tx.businessRatio ?? 100)) / 100,
      0
    );
  const paymentMethodBreakdown = transactions
    .filter((tx) => tx.amountYen < 0)
    .reduce<Record<string, number>>((acc, tx) => {
      acc[tx.paymentMethod] = (acc[tx.paymentMethod] ?? 0) + tx.amountYen;
      return acc;
    }, {});
  const untriaged = transactions.filter((tx) => tx.isBusiness === undefined).length;

  return {
    income,
    expenses,
    balance: income + expenses,
    businessExpenses,
    paymentMethodBreakdown,
    untriaged
  };
}
