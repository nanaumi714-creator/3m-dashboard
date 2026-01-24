export type Transaction = {
  id: string;
  occurredOn: string;
  amountYen: number;
  description: string;
  paymentMethod: string;
  vendor: string;
  vendorRaw: string;
  isBusiness?: boolean;
  businessRatio?: number;
};

export type Receipt = {
  id: string;
  transactionId: string;
  storageUrl: string;
};

export const transactions: Transaction[] = [
  {
    id: "tx-001",
    occurredOn: "2025-01-10",
    amountYen: -12500,
    description: "AWS Hosting",
    paymentMethod: "Visa",
    vendor: "aws",
    vendorRaw: "Amazon Web Services",
    isBusiness: true,
    businessRatio: 100
  },
  {
    id: "tx-002",
    occurredOn: "2025-01-12",
    amountYen: -980,
    description: "Seven Eleven",
    paymentMethod: "Cash",
    vendor: "seveneleven",
    vendorRaw: "セブンイレブン 新宿店"
  },
  {
    id: "tx-003",
    occurredOn: "2025-01-15",
    amountYen: 250000,
    description: "Client Invoice #2025-01",
    paymentMethod: "Bank",
    vendor: "client",
    vendorRaw: "取引先A 1月分請求"
  },
  {
    id: "tx-004",
    occurredOn: "2025-01-18",
    amountYen: -4200,
    description: "Notion Subscription",
    paymentMethod: "Mastercard",
    vendor: "notion",
    vendorRaw: "Notion Labs, Inc.",
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
    vendorRaw: "JR東日本",
    isBusiness: false,
    businessRatio: 0
  }
];

export const receipts: Receipt[] = [
  {
    id: "rcpt-001",
    transactionId: "tx-001",
    storageUrl: "https://drive.google.com/example/receipt-aws"
  },
  {
    id: "rcpt-002",
    transactionId: "tx-004",
    storageUrl: "https://drive.google.com/example/receipt-notion"
  }
];

export const paymentMethods = ["All", "Cash", "Bank", "Visa", "Mastercard", "Suica"];
