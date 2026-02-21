# Domain Rules: Money & Transactions

## Currency & Precision
- **Currency**: JPY (Japanese Yen) ONLY.
- **Storage**: Store as `INTEGER` in the database.
- **No Decimals**: JPY has no decimal units in this context. Float/Double is PROHIBITED for storage to avoid floating-point errors.

## Calculation Rules
- **Rounding**: If any division occurs (e.g., tax calculation), rounding must be performed ON THE SERVER SIDE.
- **Strategy**: Round half up (standard) unless specified otherwise.
- **Negative Values**: STRICTLY enforced.
    - Income: Positive (+)
    - Expense: Negative (-)
    - *Note*: The database schema and frontend logic rely on this sign convention. Do not use separate type flags for sign.

## Implementation Examples

### ❌ NG (Do NOT do this)
```typescript
// NEVER use floats for currency
const price = 1000;
const taxRate = 0.1;
const tax = price * taxRate; // Result: 100.0 (Float risk)

// NEVER rely on client-side rounding
const total = Math.round(price * 1.1); // Client clock/env variance check? No, but logic belongs on server.

// NEVER use Decimal types unless strictly required and supported by DB
// const amount = new Decimal(1000); // Overkill if Integer suffices and safer.
```

### ✅ OK (Do this)
```typescript
// ALWAYS use Integers
const price = 1000;
const taxRatePercent = 10; // Use integer percentages

// Server-side calculation only
const tax = Math.floor((price * taxRatePercent) / 100); 

// Handling updates
const newTotal = currentTotal + tax;
```

## Idempotency
- **Receipt Import**: Re-uploading the exact same receipt image should NOT create a duplicate transaction if it has already been processed and confirmed.
- **Verification**: Use hash of the image or unique transaction ID from OCR provider.

## Transaction Status
- **Draft/Pending**: OCR processed but not confirmed by user.
- **Confirmed**: User reviewed and saved.
- **Deleted**: Logical deletion. Data must be retrievable for audit if necessary.
