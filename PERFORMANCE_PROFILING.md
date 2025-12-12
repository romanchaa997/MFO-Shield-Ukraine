# Performance Profiling Guide for MFO Shield Ukraine

## Overview

This guide provides strategies and tools for profiling and optimizing the performance of the MFO Shield Ukraine application across frontend, backend, and database layers.

## Frontend Performance Profiling (React/TypeScript)

### 1. Chrome DevTools Performance Tab

```javascript
// Record performance
performance.mark('operation-start');
// ... operation code ...
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');

// View measurements
const measures = performance.getEntriesByType('measure');
console.table(measures);
```

### 2. React Profiler API

```typescript
import { Profiler } from 'react';

const onRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  console.log(`Component ${id} (${phase}) took ${actualDuration}ms`);
};

<Profiler id="LoanComponent" onRender={onRenderCallback}>
  <LoanAnalysis />
</Profiler>
```

### 3. Web Vitals Monitoring

```typescript
import { getCLS, getFID, getFCP, getLCP, getTTFB } from 'web-vitals';

function sendToAnalytics(metric: any) {
  console.log(metric);
  // Send to analytics service
}

getCLS(sendToAnalytics);
getFID(sendToAnalytics);
getFCP(sendToAnalytics);
getLCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

### 4. Bundle Size Analysis

```bash
# Using webpack-bundle-analyzer
npm install --save-dev webpack-bundle-analyzer

# Check bundle size
webpack-cli build --profile --json > stats.json

# Analyze with CLI
webpack-bundle-analyzer stats.json
```

### 5. Component Rendering Optimization

```typescript
import React, { memo, useMemo, useCallback } from 'react';

// Memoize component
const LoanAnalysisItem = memo(({ loan, onSelect }) => {
  return <div onClick={onSelect}>{loan.id}</div>;
});

// Memoize expensive calculations
const MemoizedLoanList = ({ loans }) => {
  const sortedLoans = useMemo(
    () => loans.sort((a, b) => b.amount - a.amount),
    [loans]
  );

  const handleSelect = useCallback((id) => {
    console.log('Selected:', id);
  }, []);

  return (
    <>
      {sortedLoans.map((loan) => (
        <LoanAnalysisItem
          key={loan.id}
          loan={loan}
          onSelect={() => handleSelect(loan.id)}
        />
      ))}
    </>
  );
};
```

## Backend Performance Profiling (Python)

### 1. cProfile for Function-Level Profiling

```python
import cProfile
import pstats
from io import StringIO

def profile_function():
    pr = cProfile.Profile()
    pr.enable()
    
    # Code to profile
    analyze_loan_risk(loan_data)
    
    pr.disable()
    s = StringIO()
    ps = pstats.Stats(pr, stream=s).sort_stats('cumulative')
    ps.print_stats(10)  # Top 10 functions
    print(s.getvalue())

# Or use as decorator
@profile
def analyze_loan_risk(loan):
    # Implementation
    pass
```

### 2. Line Profiler for Line-by-Line Analysis

```python
from line_profiler import LineProfiler

lp = LineProfiler()
lp.add_function(calculate_risk_score)
lp_wrapper = lp(calculate_risk_score)

lp.enable()
lp_wrapper(loan_data)
lp.disable()
lp.print_stats()
```

### 3. Memory Profiling

```python
from memory_profiler import profile
import tracemalloc

# Method 1: Using decorator
@profile
def load_loan_database():
    loans = []
    for i in range(1000000):
        loans.append({...})
    return loans

# Method 2: Using tracemalloc
tracemalloc.start()
snapshot1 = tracemalloc.take_snapshot()

# Code to profile
analyze_all_loans()

snapshot2 = tracemalloc.take_snapshot()
top_stats = snapshot2.compare_to(snapshot1, 'lineno')

for stat in top_stats[:10]:
    print(stat)
```

### 4. Timing Decorators

```python
import functools
import time

def timing_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        result = func(*args, **kwargs)
        end = time.perf_counter()
        print(f'{func.__name__} took {end - start:.4f} seconds')
        return result
    return wrapper

@timing_decorator
def assess_borrower_creditworthiness(borrower_id):
    # Implementation
    pass
```

## Database Query Optimization

### 1. SQL Query Analysis

```sql
-- Enable query profiling in PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM loans
WHERE borrower_id = $1
AND status = 'active'
ORDER BY created_at DESC;

-- Create indexes for frequently queried columns
CREATE INDEX idx_loans_borrower_status ON loans(borrower_id, status);
CREATE INDEX idx_loans_created ON loans(created_at);
```

### 2. Query Monitoring

```python
# Log slow queries
SLOW_QUERY_THRESHOLD = 0.5  # seconds

@timing_decorator
def get_loan_details(loan_id: int):
    query = "SELECT * FROM loans WHERE id = %s"
    result = db.execute(query, (loan_id,))
    return result
```

### 3. Connection Pooling

```python
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    'postgresql://user:pass@localhost/mfo',
    poolclass=QueuePool,
    pool_size=20,
    max_overflow=40,
    pool_pre_ping=True,  # Test connections before using
)
```

## Distributed System Profiling

### 1. Tracing with Jaeger

```python
from jaeger_client import Config

config = Config(
    config={
        'sampler': {
            'type': 'const',
            'param': 1,
        },
        'logging': True,
    },
    service_name='mfo-coordinator',
)
tracer = config.initialize_tracer()

with tracer.start_active_span('analyze_loan') as scope:
    result = analyze_loan_risk(loan_data)
```

### 2. Metrics Collection with Prometheus

```python
from prometheus_client import Counter, Histogram, Gauge

# Define metrics
loan_analysis_duration = Histogram(
    'loan_analysis_seconds',
    'Time spent analyzing loan',
    buckets=[0.1, 0.5, 1.0, 2.5, 5.0]
)

active_analyses = Gauge(
    'active_loan_analyses',
    'Number of active loan analyses'
)

# Use metrics
with loan_analysis_duration.time():
    result = analyze_loan()

active_analyses.inc()
```

## Load Testing

### 1. Apache JMeter Configuration

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan version="1.2">
  <hashTree>
    <ThreadGroup guiclass="ThreadGroupGui" testname="Load Test" testclass="ThreadGroup">
      <stringProp name="ThreadGroup.num_threads">100</stringProp>
      <stringProp name="ThreadGroup.ramp_time">60</stringProp>
      <HTTPSamplerProxy guiclass="HttpTestSampleGui" testname="Analyze Loan" testclass="HTTPSamplerProxy">
        <stringProp name="HTTPSampler.path">/api/loans/analyze</stringProp>
        <stringProp name="HTTPSampler.method">POST</stringProp>
      </HTTPSamplerProxy>
    </ThreadGroup>
  </hashTree>
</jmeterTestPlan>
```

### 2. Locust for Python-Based Load Testing

```python
from locust import HttpUser, task, between

class LoanAnalysisUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def analyze_loan(self):
        self.client.post(
            '/api/loans/analyze',
            json={
                'borrower_id': 123,
                'amount': 10000,
                'term_months': 36
            }
        )

    @task(1)
    def get_results(self):
        self.client.get('/api/loans/results')
```

## Performance Monitoring Dashboard

### Key Metrics to Track

1. **Frontend**
   - Time to First Contentful Paint (FCP)
   - Largest Contentful Paint (LCP)
   - Cumulative Layout Shift (CLS)
   - First Input Delay (FID)
   - Bundle size
   - Component render times

2. **Backend**
   - Request latency (p50, p95, p99)
   - Throughput (requests/second)
   - Error rate
   - CPU usage
   - Memory usage
   - Database query time
   - Cache hit rate

3. **Infrastructure**
   - Pod CPU and memory
   - Network I/O
   - Disk I/O
   - Request queue length

## Optimization Checklist

- [ ] Frontend bundle size < 200KB (gzipped)
- [ ] Time to interactive < 3 seconds
- [ ] API response time < 500ms (p95)
- [ ] Database queries complete < 100ms
- [ ] Cache hit rate > 80%
- [ ] Memory usage stable (no leaks)
- [ ] CPU utilization < 70% under normal load
- [ ] Error rate < 0.1%

## Common Performance Issues

1. **N+1 Query Problem** - Use joins and eager loading
2. **Unnecessary Re-renders** - Use React.memo and useMemo
3. **Large Bundle Size** - Code splitting and lazy loading
4. **Memory Leaks** - Proper cleanup in useEffect
5. **Inefficient Algorithms** - Profile and optimize hot paths
6. **Missing Indexes** - Add indexes to frequently queried columns
7. **Lack of Caching** - Implement appropriate caching strategies
