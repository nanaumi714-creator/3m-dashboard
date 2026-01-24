# Frontend-Specific Instructions

**Applies to**: `frontend/**/*.{ts,tsx,css}`

---

## Tech Stack

- Framework: Next.js 14+ (App Router)
- Styling: Tailwind CSS (utility classes only)
- Data: Supabase Client (no ORM)
- State: React hooks (no Redux/Zustand in Phase 1)
- Types: Strict TypeScript (no `any`)

---

## Directory Structure

```
frontend/
├── app/
│   ├── (dashboard)/
│   │   ├── transactions/
│   │   ├── triage/
│   │   └── overview/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── transactions/    # Transaction-specific
│   ├── triage/          # Triage Queue-specific
│   └── common/          # Shared components
├── lib/
│   ├── supabase.ts      # Supabase client
│   ├── types.ts         # Type definitions
│   └── utils.ts         # Utilities
└── hooks/
    ├── useTransactions.ts
    └── useTriageQueue.ts
```

---

## Supabase Client Usage

### ✅ Correct Patterns

```typescript
// ✅ Standard select with join
const { data, error } = await supabase
  .from('transactions')
  .select('*, payment_methods(*), transaction_business_info(*)')
  .order('occurred_on', { ascending: false })
  .range(0, 49); // Pagination

if (error) {
  console.error('Error:', error);
  throw error; // or handle gracefully
}

// ✅ Insert with error handling
const { error } = await supabase
  .from('transaction_business_info')
  .upsert({
    transaction_id: id,
    is_business: true,
    business_ratio: 100,
    judged_at: new Date().toISOString(),
  });

if (error) {
  console.error('Failed to save judgment:', error);
  toast.error('Failed to save judgment');
  return;
}
```

### ❌ Anti-Patterns

```typescript
// ❌ No error handling
const { data } = await supabase.from('transactions').select('*');

// ❌ Using 'any' type
const fetchData = async (): Promise<any> => { ... }

// ❌ localStorage/sessionStorage
localStorage.setItem('filters', JSON.stringify(filters));

// ❌ Raw SQL
supabase.rpc('execute_sql', { query: 'SELECT ...' });
```

---

## State Management

### Phase 1: Keep It Simple

- **Server state**: Managed by Supabase Client
- **Client state**: `useState` / `useReducer`
- **No Redux/Zustand** until Phase 2+

### Data Fetching Pattern

```typescript
// ✅ Custom hook with loading/error states
export function useTransactions(filters: FilterParams) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTransactions() {
      setLoading(true);
      setError(null);
      
      try {
        let query = supabase
          .from('transactions')
          .select('*, payment_methods(*), transaction_business_info(*)');

        // Apply filters
        if (filters.startDate) {
          query = query.gte('occurred_on', filters.startDate);
        }
        if (filters.endDate) {
          query = query.lte('occurred_on', filters.endDate);
        }

        const { data, error } = await query;
        
        if (error) throw error;
        setTransactions(data || []);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [filters.startDate, filters.endDate]); // Dependency array

  return { transactions, loading, error };
}
```

---

## Tailwind CSS Guidelines

### ✅ Use Only

```typescript
// ✅ Utility classes
<div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
  <span className="text-sm font-medium">{description}</span>
  <span className="text-lg font-bold text-red-600">-¥{amount}</span>
</div>

// ✅ Conditional classes with cn utility
import { cn } from '@/lib/utils';

<div className={cn(
  "px-2 py-1 rounded",
  isExpense ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"
)}>
  {label}
</div>
```

### ❌ Avoid

```typescript
// ❌ Custom CSS files
import './custom.css';

// ❌ @apply directive
.btn-primary {
  @apply bg-blue-500 text-white px-4 py-2;
}

// ❌ Inline styles
<div style={{ backgroundColor: 'red' }}>
```

---

## Component Design Principles

### 1. Single Responsibility

```typescript
// ✅ Good: One component = one thing
export function TransactionRow({ transaction }: { transaction: Transaction }) {
  if (!transaction) return null;
  
  const isExpense = transaction.amount_yen < 0;
  const formattedAmount = formatAmount(Math.abs(transaction.amount_yen));
  
  return (
    <tr className="hover:bg-gray-50">
      <td className="px-4 py-2">
        {format(new Date(transaction.occurred_on), 'yyyy-MM-dd')}
      </td>
      <td className="px-4 py-2">{transaction.description}</td>
      <td className={cn(
        "px-4 py-2 text-right font-mono",
        isExpense ? "text-red-600" : "text-green-600"
      )}>
        {isExpense ? '-' : '+'}¥{formattedAmount}
      </td>
    </tr>
  );
}

// ❌ Bad: Props as 'any', no formatting
export function TransactionRow({ transaction }: any) {
  return <tr><td>{transaction.occurred_on}</td></tr>;
}
```

### 2. Early Returns

```typescript
// ✅ Good: Early return reduces nesting
export function TriageQueueItem({ transaction }: Props) {
  if (!transaction) return null;
  if (transaction.transaction_business_info) return null; // Already judged
  
  return <div>...</div>;
}

// ❌ Bad: Deep nesting
export function TriageQueueItem({ transaction }: Props) {
  return (
    <div>
      {transaction && !transaction.transaction_business_info && (
        <div>...</div>
      )}
    </div>
  );
}
```

---

## Type Safety

### Generate Types from Supabase

```bash
npx supabase gen types typescript --local > lib/database.types.ts
```

### Use Generated Types

```typescript
import { Database } from '@/lib/database.types';

export type Transaction = Database['public']['Tables']['transactions']['Row'];
export type TransactionInsert = Database['public']['Tables']['transactions']['Insert'];

// Extended types for joins
export type TransactionWithJudgment = Transaction & {
  transaction_business_info: TransactionBusinessInfo | null;
  payment_methods: PaymentMethod;
};
```

### Never Use 'any'

```typescript
// ❌ Never
const handleSubmit = (data: any) => { ... }

// ✅ Always
const handleSubmit = (data: TransactionJudgment) => { ... }
```

---

## Error Handling

### Always Handle Errors

```typescript
// ✅ Good
async function saveJudgment(data: JudgmentData) {
  try {
    const { error } = await supabase
      .from('transaction_business_info')
      .upsert(data);
    
    if (error) throw error;
    
    toast.success('Judgment saved');
  } catch (error) {
    console.error('Failed to save judgment:', error);
    toast.error('Failed to save judgment');
  }
}

// ❌ Bad: Silent failure
async function saveJudgment(data: JudgmentData) {
  await supabase.from('transaction_business_info').upsert(data);
}
```

---

## Performance

### Pagination Required

```typescript
// ✅ Always paginate lists
const PAGE_SIZE = 50;

const { data } = await supabase
  .from('transactions')
  .select('*')
  .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);
```

### Debounce Search

```typescript
import { useDebouncedCallback } from 'use-debounce';

const debouncedSearch = useDebouncedCallback(
  (value: string) => setSearchQuery(value),
  300
);
```

---

## Common Patterns

### Filtering Untriaged Transactions

```typescript
// Query for transactions without judgment
const { data: untriagedTransactions } = await supabase
  .from('transactions')
  .select('*, transaction_business_info(*)')
  .is('transaction_business_info.transaction_id', null)
  .order('amount_yen', { ascending: true }); // Highest expense first
```

### Monthly Aggregation

```typescript
const { data: monthlyData } = await supabase.rpc('get_monthly_summary', {
  start_date: startOfMonth,
  end_date: endOfMonth,
});

// Or client-side aggregation for Phase 1
const monthlyTotal = transactions.reduce((sum, t) => sum + t.amount_yen, 0);
```

---

## Phase 1 Constraints

### No Mobile Optimization Yet

```typescript
// ✅ Desktop-first, responsive later
<div className="min-w-[1024px]"> {/* OK in Phase 1 */}

// ❌ Don't spend time on mobile gestures yet
const handleSwipe = (direction: string) => { ... } // Phase 4
```

### No localStorage

```typescript
// ❌ Phase 1 forbidden
localStorage.setItem('filters', JSON.stringify(filters));

// ✅ Use URL params or server state
const searchParams = useSearchParams();
const filters = {
  startDate: searchParams.get('start'),
  endDate: searchParams.get('end'),
};
```

---

## Testing (Optional in Phase 1)

If adding tests later:

```typescript
// Unit test example
import { render, screen } from '@testing-library/react';
import { TransactionRow } from './TransactionRow';

test('renders expense with negative sign', () => {
  const transaction = {
    id: '1',
    amount_yen: -1500,
    description: 'Coffee',
    occurred_on: '2025-01-01',
  };
  
  render(<TransactionRow transaction={transaction} />);
  expect(screen.getByText('-¥1,500')).toBeInTheDocument();
});
```

---

## When in Doubt

1. Check if feature is allowed in current phase (`ai/PHASE.md`)
2. Prefer simple React patterns (no complex libraries)
3. Always handle errors
4. Use TypeScript strictly (no `any`)
5. Ask user if unsure about UX decisions
