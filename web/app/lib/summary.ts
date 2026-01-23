import { Transaction } from "./mock-data";

export function buildSummary(transactions: Transaction[]) {
  const income = transactions
    .filter((tx) => tx.amountYen > 0)
    .reduce((sum, tx) => sum + tx.amountYen, 0);
  const expenses = transactions
    .filter((tx) => tx.amountYen < 0)
    .reduce((sum, tx) => sum + tx.amountYen, 0);
  const untriaged = transactions.filter((tx) => tx.isBusiness === undefined).length;

  return {
    income,
    expenses,
    balance: income + expenses,
    untriaged
  };
}
