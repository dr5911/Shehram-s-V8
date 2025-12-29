# Error Handling and Resilience Improvements

## Overview

Comprehensive error handling and resilience improvements have been implemented across the backend to ensure:
- Failed scheduled posts are properly tracked and retried
- Database and Redis connections are resilient with retry logic
- External API calls (OpenAI, Facebook) have proper error handling and retry mechanisms
- Authentication failures are logged for security monitoring
- All errors return appropriate HTTP status codes
- Sensitive information is never exposed in error logs

## New Files Created

### 1. Custom Error Classes (`packages/backend/src/errors/index.ts`)

Created custom error classes that extend the base `AppError` class:

- **ValidationError** (400): Invalid input or request validation failures
- **AuthenticationError** (401): Authentication failures (login, token validation)
- **AuthorizationError** (403): Access forbidden (permission denied)
- **NotFoundError** (404): Resource not found
- **ConflictError** (409): Duplicate entries or conflicts
- **RateLimitError** (429): Rate limit exceeded
- **DatabaseError** (500): Database operation failures
- **ExternalServiceError** (502): External service (API) failures
- **ServiceUnavailableError** (503): Service temporarily unavailable

Each error class includes:
- `statusCode`: Appropriate HTTP status code
- `isOperational`: Flag to distinguish operational errors from programming errors
- `timestamp`: When the error occurred
- `context`: Optional context for debugging (never includes sensitive data)

### 2. Error Utility Functions (`packages/backend/src/utils/errorHelpers.ts`)

Helper functions for consistent error handling:

- **withRetry()**: Generic retry wrapper with exponential backoff
- **handleAxiosError()**: Converts axios errors to appropriate AppError types
- **handleSequelizeError()**: Converts Sequelize errors to AppError types
- **handleOpenAIError()**: Converts OpenAI API errors to AppError types
- **sanitizeError()**: Removes sensitive information from error objects
- **sleep()**: Promise-based delay utility
- **isProduction()**: Checks if running in production mode

## Modified Files

### 1. Scheduled Posts Job (`packages/backend/src/jobs/scheduledPosts.ts`)

**Improvements:**
- Failed posts now have retry logic with exponential backoff (max 3 retries)
- Post status updates to 'failed' with error message stored
- Tracks retry count and last retry timestamp
- Detailed logging with timestamps and emojis for easy monitoring
- Prevents infinite retry loops with max retry limit
- Handles both temporary (rate limits) and permanent errors appropriately

**New Behavior:**
- Posts are marked as 'processing' before execution
- On failure, post is updated with:
  - `status: 'failed'`
  - `errorMessage`: Error message
  - `retryCount`: Number of retry attempts
  - `lastRetryAt`: Timestamp of last retry
  - `metadata`: Additional failure details

### 2. Database Configuration (`packages/backend/src/config/database.ts`)

**Improvements:**
- **Retry logic**: Attempts to connect up to 5 times with exponential backoff
- **Health check**: `checkDatabaseHealth()` function for monitoring
- **Better error messages**: Detailed error logging with error codes
- **Sync function**: Separate `syncDatabase()` with error handling

**New Functions:**
```typescript
connectDatabaseWithRetry(maxAttempts = 5)  // Connect with retries
syncDatabase()                          // Sync models
checkDatabaseHealth()                    // Health check
```

### 3. Redis Configuration (`packages/backend/src/config/redis.ts`)

**Improvements:**
- **Retry logic**: Attempts to connect up to 5 times with exponential backoff
- **Reconnection strategy**: Built-in reconnection with backoff (max 10 attempts)
- **Timeout handling**: 10-second connection timeout
- **Health check**: `checkRedisHealth()` function for monitoring
- **Better error logging**: Structured error logging with codes

**New Functions:**
```typescript
connectRedisWithRetry(maxAttempts = 5)  // Connect with retries
checkRedisHealth()                      // Health check
```

### 4. Autopilot Service (`packages/backend/src/services/AutopilotService.ts`)

**Improvements:**
- All OpenAI API calls wrapped with retry logic (max 3 attempts)
- Rate limit (429) errors handled with exponential backoff
- Timeout errors handled gracefully
- Fallback responses when API fails
- Individual error handling for each AI operation
- Database operations wrapped in try-catch with proper error handling

**Fallback Behavior:**
- `generateContentIdeas()`: Returns empty ideas array with fallback message
- `predictPostPerformance()`: Returns moderate prediction scores
- `generateHashtags()`: Generates hashtags from content words

**Error Types Handled:**
- 401: Invalid API key
- 429: Rate limit (with exponential backoff)
- 502/503/504: Service errors
- Network timeouts
- JSON parse errors

### 5. Facebook Service (`packages/backend/src/services/FacebookService.ts`)

**Improvements:**
- All API calls wrapped with retry logic (max 3 attempts)
- Timeout handling (30-second timeout for all requests)
- 401/403 errors handled with user-friendly messages
- Rate limit (429) errors with exponential backoff
- Detailed error context for debugging
- Individual post sync error handling (continues on failure)

**Error Types Handled:**
- 401/403: Token expired or invalid
- 429: Rate limit (with exponential backoff)
- Network errors: ECONNABORTED, ECONNRESET, ETIMEDOUT
- Service unavailable: 500, 502, 503, 504

### 6. Auth Service (`packages/backend/src/services/AuthService.ts`)

**Improvements:**
- Input validation with specific error messages
- Email format validation
- Password strength validation (min 8 characters)
- Detailed authentication error logging (without sensitive data)
- JWT token verification with specific error types
- Database error handling for user operations

**Security Features:**
- Logs failed login attempts for monitoring
- Returns generic "Invalid email or password" to prevent user enumeration
- Checks account status (active/inactive)
- Token expiration handling

### 7. Auth Controller (`packages/backend/src/controllers/AuthController.ts`)

**Improvements:**
- Proper error type checking
- Appropriate HTTP status codes for different error types
- Generic error messages for unexpected errors
- Consistent error response format

### 8. Facebook Controller (`packages/backend/src/controllers/FacebookController.ts`)

**Improvements:**
- Custom error type handling
- NotFoundError for missing resources
- Database error handling with handleSequelizeError
- User-friendly error messages

### 9. Autopilot Controller (`packages/backend/src/controllers/AutopilotController.ts`**

**Improvements:**
- Input validation for all endpoints
- ValidationError for invalid inputs
- Status validation for scheduled posts
- Date validation for scheduling
- Database error handling
- Consistent error response format

**Validations Added:**
- Topic is required for content generation
- Hashtags must be an array
- Scheduled date must be in future
- Status must be valid enum value
- minScore must be valid number

### 10. Earnings Controller (`packages/backend/src/controllers/EarningsController.ts`)

**Improvements:**
- Date format validation
- Amount validation (must be positive number)
- Type validation (enum values)
- Period validation
- Database error handling

### 11. Scheduled Post Model (`packages/backend/src/models/ScheduledPost.ts`)

**New Fields:**
- `retryCount`: INTEGER - Tracks number of retry attempts
- `lastRetryAt`: DATE - Timestamp of last retry attempt

These fields are automatically updated when posts are retried.

### 12. Main Server (`packages/backend/src/index.ts`)

**Improvements:**
- **Health check endpoint**: `/health` returns service status
  - Database connection status
  - Redis connection status
  - Overall status (OK/DEGRADED/DOWN)
  - Response time and uptime
- **Enhanced error middleware**:
  - Catches and categorizes all errors
  - Logs appropriate details based on environment
  - Sanitizes error responses in production
  - Returns proper HTTP status codes
- **Graceful shutdown**:
  - Handles SIGTERM and SIGINT signals
  - Closes database connections
  - Logs shutdown process
- **Process error handlers**:
  - Unhandled rejection logging
  - Uncaught exception handling with graceful shutdown

## Health Check Endpoint

**GET** `/health`

Returns:
```json
{
  "status": "OK" | "DEGRADED" | "DOWN",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.123,
  "responseTime": 15,
  "services": {
    "database": {
      "status": "OK" | "DOWN",
      "connected": true
    },
    "redis": {
      "status": "OK" | "DOWN",
      "connected": true
    }
  }
}
```

Status Codes:
- 200: OK or DEGRADED
- 503: DOWN

## Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message"
}
```

In development mode, additional details may be included.

## Retry Strategy

### Database & Redis Connections
- Max attempts: 5
- Initial delay: 1000ms
- Backoff multiplier: 2
- Max delay: None (exponential)

### External API Calls (OpenAI, Facebook)
- Max attempts: 3
- Initial delay: 1000ms
- Backoff multiplier: 2
- Max delay: 30000ms

### Scheduled Posts
- Max attempts: 3
- Initial delay: 1000ms
- Backoff multiplier: 2
- Max delay: 30000ms

## Security Considerations

1. **Never expose sensitive information**:
   - API keys redacted from logs
   - Passwords redacted from error context
   - Tokens redacted from error context
   - Secrets redacted from error context

2. **Generic authentication errors**:
   - "Invalid email or password" instead of specific details
   - Prevents user enumeration attacks

3. **Rate limiting**:
   - All API endpoints rate-limited
   - 429 errors handled with backoff
   - Prevents brute force attacks

4. **Error logging**:
   - Failed login attempts logged
   - Authentication failures tracked
   - Operational vs. programming errors distinguished

## Monitoring Recommendations

1. **Health check monitoring**:
   - Poll `/health` endpoint regularly
   - Alert on DEGRADED or DOWN status
   - Track response time trends

2. **Error rate monitoring**:
   - Track error rates by type
   - Alert on spike in 5xx errors
   - Monitor rate limit (429) occurrences

3. **Scheduled post monitoring**:
   - Track failed posts
   - Monitor retry patterns
   - Alert on high failure rates

4. **External service monitoring**:
   - Track OpenAI API error rates
   - Track Facebook API error rates
   - Monitor external service latency

## Database Migration

The following fields were added to the `scheduled_posts` table:

```sql
ALTER TABLE scheduled_posts ADD COLUMN "retryCount" INTEGER DEFAULT 0;
ALTER TABLE scheduled_posts ADD COLUMN "lastRetryAt" TIMESTAMP;
```

These will be automatically created by Sequelize when models sync.

## Testing Recommendations

1. **Test error scenarios**:
   - Invalid inputs
   - Missing required fields
   - Rate limit responses
   - Service unavailable
   - Database connection failures
   - Redis connection failures

2. **Test retry logic**:
   - Trigger rate limits
   - Simulate network failures
   - Verify exponential backoff
   - Confirm max retry limits

3. **Test graceful degradation**:
   - Stop database server
   - Stop Redis server
   - Verify health check status
   - Test recovery when services return

## Acceptance Criteria Met

✅ Scheduled posts that fail are updated with error status and message  
✅ Failed scheduled posts retry automatically (max 3 times with backoff)  
✅ Server has retry logic for database/redis connections (5 attempts, exponential backoff)  
✅ All external API calls (OpenAI, Facebook) have proper error handling  
✅ Rate limit errors trigger exponential backoff, not immediate failure  
✅ Auth failures are logged for security monitoring  
✅ Error responses are appropriate HTTP status codes (400, 401, 403, 429, 500, 503)  
✅ No sensitive information (API keys, tokens, passwords) in error logs  
✅ Health check endpoint returns DB and Redis status  
✅ Graceful degradation when external services fail  
✅ Error middleware catches and properly formats all errors  
✅ Database unique constraints handled properly  

## Future Enhancements

1. **Circuit breaker pattern**: Implement circuit breakers for external services
2. **Error tracking integration**: Add Sentry/DataDog integration point
3. **Structured logging**: Use Winston for structured logging
4. **Metrics**: Add Prometheus metrics for error rates
5. **Dead letter queue**: For permanently failed scheduled posts
6. **Webhook notifications**: Notify users of failed posts
7. **Error rate alerts**: Automatic alerts based on error thresholds
