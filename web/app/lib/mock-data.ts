export type Transaction = {
  id: string;
  occurredOn: string;
  amountYen: number;
  description: string;
  paymentMethod: string;
  vendor: string;
  isBusiness?: boolean;
  businessRatio?: number;
};

export const transactions: Transaction[] = [
  {
    id: "tx-001",
    occurredOn: "2025-01-10",
    amountYen: -12500,
    description: "AWS Hosting",
    paymentMethod: "Visa",
    vendor: "aws",
    isBusiness: true,
    businessRatio: 100
  },
  {
    id: "tx-002",
    occurredOn: "2025-01-12",
    amountYen: -980,
    description: "Seven Eleven",
    paymentMethod: "Cash",
    vendor: "seveneleven"
  },
  {
    id: "tx-003",
    occurredOn: "2025-01-15",
    amountYen: 250000,
    description: "Client Invoice #2025-01",
    paymentMethod: "Bank",
    vendor: "client"
  },
  {
    id: "tx-004",
    occurredOn: "2025-01-18",
    amountYen: -4200,
    description: "Notion Subscription",
    paymentMethod: "Mastercard",
    vendor: "notion",
    isBusiness: true,
    businessRatio: 100
  },
  {
    id: "tx-005",
    occurredOn: "2025-01-20",
    amountYen: -3500,
    description: "交通費",
    paymentMethod: "Suica",
    vendor: "jr",
    isBusiness: false,
    businessRatio: 0
  }
];

export const paymentMethods = ["All", "Cash", "Bank", "Visa", "Mastercard", "Suica"];
