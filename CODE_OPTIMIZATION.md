# Code Optimization Guide for MFO Shield Ukraine

## Overview

This guide provides strategies and best practices for optimizing code in the MFO Shield Ukraine application, focusing on algorithm selection, memory management, and caching strategies.

## Algorithm Optimization

### 1. Time Complexity Analysis

```python
# Bad: O(n²) - nested loops
def find_matching_loans(loans, criteria):
    matches = []
    for loan in loans:
        for criterion in criteria:
            if loan.matches(criterion):
                matches.append(loan)
    return matches

# Good: O(n + m) - separate iterations
def find_matching_loans_optimized(loans, criteria):
    criteria_set = set(criteria)
    return [loan for loan in loans if loan.meets_any_criteria(criteria_set)]
```

### 2. Data Structure Selection

```python
# Bad: O(n) lookup time
loan_statuses = ['PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED']
if loan_status in loan_statuses:  # Linear search
    process_loan()

# Good: O(1) lookup time
VALID_LOAN_STATUSES = {'PENDING', 'APPROVED', 'REJECTED', 'ACTIVE', 'CLOSED'}
if loan_status in VALID_LOAN_STATUSES:  # Hash lookup
    process_loan()
```

### 3. Sorting Optimization

```python
# Bad: Sorting entire list
def get_top_risky_loans(loans):
    sorted_loans = sorted(loans, key=lambda x: x.risk_score, reverse=True)
    return sorted_loans[:10]

# Good: Using heap for top-k
import heapq

def get_top_risky_loans_optimized(loans):
    return heapq.nlargest(10, loans, key=lambda x: x.risk_score)
```

## Memory Optimization

### 1. Eliminating Unnecessary Allocations

```python
# Bad: Creates intermediate strings
def format_loan_report(loans):
    report = ""
    for loan in loans:
        report += f"Loan {loan.id}: ${loan.amount}\n"  # String concatenation
    return report

# Good: Use list and join
def format_loan_report_optimized(loans):
    lines = [f"Loan {loan.id}: ${loan.amount}" for loan in loans]
    return "\n".join(lines)
```

### 2. Generator Functions for Large Datasets

```python
# Bad: Loads entire dataset into memory
def get_all_loan_transactions(loan_ids):
    transactions = []
    for loan_id in loan_ids:
        transactions.extend(db.get_transactions(loan_id))
    return transactions

# Good: Yields transactions one at a time
def get_all_loan_transactions_optimized(loan_ids):
    for loan_id in loan_ids:
        yield from db.get_transactions(loan_id)

# Usage
for transaction in get_all_loan_transactions_optimized(loan_ids):
    process_transaction(transaction)
```

### 3. Object Pooling

```python
class LoanAnalysisBuffer:
    """Reuse buffer objects to reduce GC pressure"""
    def __init__(self, max_buffers=100):
        self.available = [self._create_buffer() for _ in range(max_buffers)]
        self.in_use = []

    def acquire(self):
        if self.available:
            return self.available.pop()
        return self._create_buffer()

    def release(self, buffer):
        buffer.clear()
        self.available.append(buffer)

    @staticmethod
    def _create_buffer():
        return {'data': [], 'metadata': {}}

# Usage
buffer_pool = LoanAnalysisBuffer()
buffer = buffer_pool.acquire()
try:
    # Process with buffer
    pass
finally:
    buffer_pool.release(buffer)
```

## Caching Strategies

### 1. Function-Level Caching

```python
from functools import lru_cache

@lru_cache(maxsize=1024)
def calculate_loan_risk_score(borrower_id, loan_amount, term_months):
    """Cache expensive calculation"""
    # Complex credit analysis
    return risk_score

# Clear cache when data changes
calculate_loan_risk_score.cache_clear()
```

### 2. Multi-Level Caching

```python
from cachetools import TTLCache
import time

class LoanCache:
    def __init__(self):
        # L1: Memory cache (in-process)
        self.l1_cache = TTLCache(maxsize=1000, ttl=3600)  # 1 hour TTL
        
        # L2: Redis cache (distributed)
        self.redis = redis.Redis(host='localhost')

    def get_loan(self, loan_id):
        # Check L1 first
        if loan_id in self.l1_cache:
            return self.l1_cache[loan_id]

        # Check L2
        cached = self.redis.get(f"loan:{loan_id}")
        if cached:
            loan = json.loads(cached)
            self.l1_cache[loan_id] = loan
            return loan

        # Fetch from database
        loan = db.get_loan(loan_id)
        
        # Populate caches
        self.l1_cache[loan_id] = loan
        self.redis.setex(f"loan:{loan_id}", 3600, json.dumps(loan))
        
        return loan
```

### 3. Cache Invalidation

```python
class InvalidationStrategy:
    """Different strategies for cache invalidation"""
    
    @staticmethod
    def ttl_based():
        """Time-to-live based invalidation"""
        cache = TTLCache(maxsize=10000, ttl=300)  # 5 minutes
        
    @staticmethod
    def event_based():
        """Invalidate on specific events"""
        def on_loan_updated(loan_id):
            cache.invalidate(f"loan:{loan_id}")
            pubsub.publish(f"loan:updated:{loan_id}")
    
    @staticmethod
    def lru_based():
        """Least recently used eviction"""
        cache = LRUCache(maxsize=1000)
```

## Frontend Optimization (React/TypeScript)

### 1. Code Splitting

```typescript
import { lazy, Suspense } from 'react';

const LoanAnalysisPage = lazy(() => import('./pages/LoanAnalysis'));
const ReportPage = lazy(() => import('./pages/Report'));

export function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/analysis" element={<LoanAnalysisPage />} />
        <Route path="/report" element={<ReportPage />} />
      </Routes>
    </Suspense>
  );
}
```

### 2. Memoization

```typescript
import { useMemo, useCallback, memo } from 'react';

const LoanItem = memo(({ loan, onSelect }: Props) => {
  return <div onClick={() => onSelect(loan.id)}>{loan.id}</div>;
});

function LoanList({ loans }: Props) {
  // Memoize expensive calculations
  const sortedLoans = useMemo(
    () => loans.sort((a, b) => b.amount - a.amount),
    [loans]
  );

  // Memoize callbacks
  const handleSelect = useCallback((id: string) => {
    console.log('Selected:', id);
  }, []);

  return (
    <div>
      {sortedLoans.map(loan => (
        <LoanItem key={loan.id} loan={loan} onSelect={handleSelect} />
      ))}
    </div>
  );
}
```

### 3. Virtual Scrolling for Large Lists

```typescript
import { FixedSizeList as List } from 'react-window';

function LargeLoanList({ loans }: Props) {
  const Row = ({ index, style }: any) => (
    <div style={style}>
      Loan {loans[index].id}: ${loans[index].amount}
    </div>
  );

  return (
    <List
      height={600}
      itemCount={loans.length}
      itemSize={35}
      width="100%"
    >
      {Row}
    </List>
  );
}
```

## Database Query Optimization

### 1. Batch Operations

```python
# Bad: Individual queries (N+1 problem)
for loan_id in loan_ids:
    loan = db.get_loan(loan_id)
    process_loan(loan)

# Good: Batch query
loans = db.get_loans_batch(loan_ids)
for loan in loans:
    process_loan(loan)
```

### 2. Query Result Caching

```python
from sqlalchemy.orm import Query

def get_active_loans_cached():
    cache_key = "active_loans"
    cached = redis.get(cache_key)
    
    if cached:
        return json.loads(cached)
    
    loans = db.session.query(Loan).filter(Loan.status == 'ACTIVE').all()
    redis.setex(cache_key, 3600, json.dumps([loan.to_dict() for loan in loans]))
    
    return loans
```

## Distributed Caching

### 1. Redis Integration

```python
from redis import Redis
import json

class RedisCache:
    def __init__(self, host='localhost', port=6379):
        self.redis = Redis(host=host, port=port, decode_responses=True)
    
    def get_or_compute(self, key, compute_func, ttl=3600):
        # Try to get from cache
        cached = self.redis.get(key)
        if cached:
            return json.loads(cached)
        
        # Compute if not cached
        result = compute_func()
        
        # Store in cache
        self.redis.setex(key, ttl, json.dumps(result))
        return result
```

### 2. Cache Warming

```python
def warm_cache():
    """Pre-populate cache with frequently accessed data"""
    cache = RedisCache()
    
    # Pre-load credit score ranges
    credit_ranges = db.get_credit_score_ranges()
    cache.redis.set('credit_ranges', json.dumps(credit_ranges), ex=86400)
    
    # Pre-load loan terms
    loan_terms = db.get_standard_loan_terms()
    cache.redis.set('loan_terms', json.dumps(loan_terms), ex=86400)
```

## Profiling and Monitoring

### 1. Performance Decorator

```python
import functools
import time
import logging

def timing_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            result = func(*args, **kwargs)
            return result
        finally:
            end = time.perf_counter()
            duration = end - start
            
            if duration > 1.0:  # Log slow operations
                logging.warning(
                    f"{func.__name__} took {duration:.2f}s (SLOW)"
                )
            else:
                logging.debug(
                    f"{func.__name__} took {duration:.2f}s"
                )
    
    return wrapper

@timing_decorator
def analyze_loan_risk(loan_id):
    pass
```

## Optimization Checklist

- [ ] Identify hot paths using profiling
- [ ] Use appropriate data structures (set > list for lookups)
- [ ] Implement caching for expensive operations
- [ ] Use database indexes for frequently queried columns
- [ ] Batch database queries
- [ ] Implement connection pooling
- [ ] Use pagination for large result sets
- [ ] Implement lazy loading for React components
- [ ] Code splitting for large bundles
- [ ] Minimize object allocations
- [ ] Use generators for streaming data
- [ ] Implement proper error handling to avoid slowdowns
