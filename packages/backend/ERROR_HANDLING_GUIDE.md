# Error Handling Quick Reference Guide

## For Developers

### Throwing Errors

```typescript
// Import the error classes
import { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError,
  ConflictError,
  RateLimitError,
  DatabaseError,
  ExternalServiceError,
  ServiceUnavailableError 
} from '../errors';

// Throw appropriate errors
throw new ValidationError('Invalid email format');
throw new AuthenticationError('Invalid credentials');
throw new NotFoundError('User not found');
throw new ConflictError('Email already registered');
throw new RateLimitError('Too many requests');
```

### Using Retry Logic

```typescript
import { withRetry } from '../utils/errorHelpers';

// Wrap any async operation with retry
const result = await withRetry(
  () => someAsyncOperation(),
  {
    maxAttempts: 3,           // Default: 3
    initialDelayMs: 1000,     // Default: 1000
    backoffMultiplier: 2,       // Default: 2
    maxDelayMs: 30000,         // Default: 30000
  }
);
```

### Handling External API Errors

```typescript
import { handleAxiosError, handleOpenAIError } from '../utils/errorHelpers';

try {
  const response = await axios.get('https://api.example.com');
  return response.data;
} catch (error) {
  handleAxiosError(error, 'Service Name');
}

try {
  const result = await openai.completions.create(...);
  return result;
} catch (error) {
  handleOpenAIError(error);
}
```

### Handling Database Errors

```typescript
import { handleSequelizeError } from '../utils/errorHelpers';

try {
  await User.create(userData);
} catch (error) {
  handleSequelizeError(error);
}
```

### Controller Pattern

```typescript
export class MyController {
  static async myAction(req: AuthRequest, res: Response) {
    try {
      // Validate inputs
      if (!req.body.requiredField) {
        throw new ValidationError('requiredField is required');
      }

      // Do work
      const result = await myService.doSomething(req.user!.id);

      // Success response
      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message,
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'An unexpected error occurred',
        });
      }
    }
  }
}
```

### Service Pattern

```typescript
export class MyService {
  static async doSomething(userId: string) {
    // Validate inputs
    if (!userId) {
      throw new ValidationError('userId is required');
    }

    try {
      // External API call with retry
      const result = await withRetry(
        () => externalApi.getData(),
        { maxAttempts: 3 }
      );

      // Database operation
      const record = await MyModel.create({
        userId,
        data: result,
      });

      return record;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error; // Re-throw AppErrors
      }
      // Handle unexpected errors
      throw new ExternalServiceError('Failed to process request');
    }
  }
}
```

### Adding Context to Errors

```typescript
throw new ValidationError('Invalid input', {
  field: 'email',
  value: input,
  reason: 'Invalid format',
});

throw new DatabaseError('Operation failed', {
  table: 'users',
  operation: 'insert',
  constraint: 'users_email_unique',
});
```

## HTTP Status Code Reference

| Error Class | Status Code | Use Case |
|-------------|--------------|-----------|
| ValidationError | 400 | Invalid input, validation failures |
| AuthenticationError | 401 | Login failures, invalid/expired tokens |
| AuthorizationError | 403 | Permission denied, admin only |
| NotFoundError | 404 | Resource not found |
| ConflictError | 409 | Duplicate entries, constraint violations |
| RateLimitError | 429 | Rate limit exceeded |
| DatabaseError | 500 | Database operation failures |
| ExternalServiceError | 502 | External API failures |
| ServiceUnavailableError | 503 | Service temporarily unavailable |

## Retry Strategy Defaults

| Operation | Max Attempts | Initial Delay | Max Delay |
|-----------|--------------|---------------|------------|
| Database Connection | 5 | 1s | None (exponential) |
| Redis Connection | 5 | 1s | None (exponential) |
| External APIs | 3 | 1s | 30s |
| Scheduled Posts | 3 | 1s | 30s |

## Security Guidelines

### DO
- Log failed authentication attempts
- Use generic error messages for auth failures
- Redact sensitive data from error context
- Validate all inputs before processing

### DON'T
- Log passwords, tokens, or API keys
- Return specific error details in production
- Expose internal system information
- Differentiate between "user not found" and "wrong password"

## Error Context Redaction

The `sanitizeError()` function automatically redacts these fields:
- password, passwd, pwd
- token, access_token, refresh_token
- secret, api_key, apikey
- auth, authorization
- Any key matching the pattern above

Example:
```typescript
throw new ValidationError('Failed', {
  password: 'secret123',     // Will be redacted to [REDACTED]
  token: 'abc123',          // Will be redacted to [REDACTED]
  email: 'user@example.com' // Will be preserved
});
```

## Health Check

```bash
# Check service health
curl http://localhost:3001/health

# Response:
{
  "status": "OK",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 3600.123,
  "responseTime": 15,
  "services": {
    "database": {
      "status": "OK",
      "connected": true
    },
    "redis": {
      "status": "OK",
      "connected": true
    }
  }
}
```

## Common Patterns

### Input Validation
```typescript
// Basic validation
if (!input) {
  throw new ValidationError('Input is required');
}

// Format validation
if (!isValidEmail(email)) {
  throw new ValidationError('Invalid email format');
}

// Enum validation
if (!validTypes.includes(type)) {
  throw new ValidationError(`Type must be one of: ${validTypes.join(', ')}`);
}
```

### Resource Existence Check
```typescript
const record = await Model.findByPk(id);
if (!record) {
  throw new NotFoundError('Resource not found');
}
```

### Permission Check
```typescript
if (record.userId !== req.user.id) {
  throw new AuthorizationError('You do not have permission');
}
```

### Database Constraint Handling
```typescript
try {
  await User.create({ email, password });
} catch (error) {
  handleSequelizeError(error);
}
// This will automatically convert:
// - UniqueConstraintError → ConflictError
// - ValidationError → ValidationError
// - ConnectionError → DatabaseError
```

## Testing Error Scenarios

```typescript
// Test that controller returns correct status
it('should return 400 for invalid input', async () => {
  const response = await request(app)
    .post('/api/resource')
    .send({ invalid: 'data' });
  
  expect(response.status).toBe(400);
  expect(response.body.success).toBe(false);
  expect(response.body.error).toContain('validation');
});

// Test retry logic
it('should retry on failure', async () => {
  let attempts = 0;
  const mockFn = jest.fn()
    .mockImplementationOnce(() => {
      attempts++;
      throw new Error('Temporary failure');
    })
    .mockResolvedValueOnce('success');
  
  const result = await withRetry(mockFn, { maxAttempts: 3 });
  
  expect(attempts).toBe(2);
  expect(result).toBe('success');
});
```

## Getting Help

If you encounter issues:
1. Check ERROR_HANDLING.md for detailed documentation
2. Check logs for detailed error information (in development)
3. Use the health check endpoint to verify service status
4. Review error context in the error metadata

## Best Practices

1. **Always use custom error classes** - Don't throw generic Error
2. **Be specific with error messages** - Help users understand the issue
3. **Add context when useful** - Include field names, IDs, etc.
4. **Never expose sensitive data** - Use sanitizeError()
5. **Log appropriately** - Details in dev, minimal in prod
6. **Handle database errors properly** - Use handleSequelizeError()
7. **Use retry logic for external APIs** - Handle transient failures
8. **Validate inputs early** - Fail fast with ValidationError
9. **Check permissions** - Use AuthorizationError when needed
10. **Return consistent responses** - Follow the pattern shown above
