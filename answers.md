# answers.md

## Additional Production-Grade Tests
- **Unit Tests**: For each scanner class (HarvesterScanner, AmassScanner) and factory logic.
- **Integration Tests**: End-to-end test from POST /scan/all to /both/status/{task_id}.
- **Error Handling**: Simulate failures like missing binary or invalid domain input.
- **Security Tests**: Ensure no command injection via subprocess and safe handling of user input.
- **Load Tests**: Test the behavior when multiple scans are triggered simultaneously.

## How to Benchmark & Optimize Performance
- **Benchmarking**: Use tools like `locust`, `wrk`, or `ab` to measure request latency and throughput.
- **Profiling**: Profile long-running scans using Python's `cProfile` or `py-spy` to find slow points.
- **Async Optimization**: Ensure background scans don't block the main thread. Use `asyncio.create_task` properly.
- **Caching**: Avoid rerunning duplicate scans in short intervals by caching recent results (e.g., Redis).

## Known OSINT Tool Bottlenecks & Mitigations
- **TheHarvester**:
  - Bottleneck: Long response time from some search engines.
  - Mitigation: Allow selecting lightweight search engines or limit results.

- **Amass**:
  - Bottleneck: Slow on large domains or when DNS resolution is involved.
  - Mitigation: Use `-passive` mode only (already implemented), parallelize scans, and time out long operations.

- **General**:
  - Bottleneck: Multiple scans running simultaneously can overload system resources.
  - Mitigation: Limit concurrency using a task queue (e.g., Celery, or FastAPI concurrency limiters).