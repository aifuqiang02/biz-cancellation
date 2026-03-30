export const portConfig = {
  // Port allocation range
  minPort: parseInt(process.env.PORT_ALLOCATION_MIN || '1000'),
  maxPort: parseInt(process.env.PORT_ALLOCATION_MAX || '2000'),

  // Default number of ports to allocate per project
  defaultCount: parseInt(process.env.PORT_ALLOCATION_DEFAULT_COUNT || '10'),

  // Maximum ports per project
  maxPerProject: parseInt(process.env.PORT_ALLOCATION_MAX_PER_PROJECT || '50'),

  // Retry configuration for concurrent allocation conflicts
  maxRetries: parseInt(process.env.PORT_ALLOCATION_MAX_RETRIES || '3'),
  retryDelayMs: parseInt(process.env.PORT_ALLOCATION_RETRY_DELAY_MS || '100'),
}
