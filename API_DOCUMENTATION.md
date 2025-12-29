# Facebook Earnings Platform - API Documentation

Base URL: `http://localhost:3001/api`

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "role": "user",
      "isActive": true
    },
    "token": "jwt_token_here"
  }
}
```

### Login
**POST** `/auth/login`

Authenticate and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "user": { /* user object */ },
    "token": "jwt_token_here"
  }
}
```

### Get Profile
**GET** `/auth/profile`

Get current user's profile.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user"
  }
}
```

### Update Password
**PUT** `/auth/password`

Update user password.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "oldPassword": "current_password",
  "newPassword": "new_password"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password updated successfully"
}
```

## Facebook Account Endpoints

### Connect Facebook Account
**POST** `/facebook/connect`

Connect a Facebook account via OAuth.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "code": "facebook_oauth_code",
  "redirectUri": "http://localhost:3000/callback"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "userId": "user_uuid",
    "facebookId": "facebook_id",
    "name": "John Doe",
    "isActive": true
  }
}
```

### Get All Accounts
**GET** `/facebook/accounts`

Get all connected Facebook accounts for current user.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "John Doe",
      "facebookId": "123456789",
      "pageId": "page_id",
      "pageName": "My Page",
      "monetizationEnabled": true,
      "isActive": true
    }
  ]
}
```

### Sync Account Data
**POST** `/facebook/:accountId/sync`

Sync content and data from Facebook.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "synced": 15
  }
}
```

### Get Monetization Status
**GET** `/facebook/:accountId/monetization`

Get monetization eligibility status.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "is_eligible_for_branded_content": true,
    "fan_count": 10000
  }
}
```

### Update Page Info
**PUT** `/facebook/:accountId/page`

Update connected page information.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "pageId": "page_id",
  "pageName": "My Page Name"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* updated account */ }
}
```

## Earnings Endpoints

### Get Earnings
**GET** `/earnings`

Get all earnings with optional filters.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `accountId` (optional) - Filter by account
- `startDate` (optional) - Start date (ISO 8601)
- `endDate` (optional) - End date (ISO 8601)
- `type` (optional) - Earning type filter

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "amount": "125.50",
      "currency": "USD",
      "earningType": "ad_revenue",
      "earningDate": "2024-01-15T10:00:00Z",
      "status": "completed",
      "facebookAccount": {
        "name": "John Doe",
        "pageName": "My Page"
      }
    }
  ]
}
```

### Get Earnings Summary
**GET** `/earnings/summary`

Get aggregated earnings summary.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `accountId` (optional) - Filter by account
- `period` (optional) - `day`, `week`, `month`, `year` (default: `month`)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "summary": [
      {
        "earningType": "ad_revenue",
        "currency": "USD",
        "total": "1250.00",
        "count": 45
      }
    ],
    "total": 1250.00,
    "period": "month"
  }
}
```

### Get Earnings by Content
**GET** `/earnings/content/:contentId`

Get all earnings for a specific content piece.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ /* earnings array */ ]
}
```

### Create Earning
**POST** `/earnings`

Manually create an earning record.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "facebookAccountId": "account_uuid",
  "contentId": "content_uuid",
  "amount": 50.00,
  "currency": "USD",
  "earningType": "ad_revenue",
  "earningDate": "2024-01-15T10:00:00Z",
  "transactionId": "TXN123456"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": { /* created earning */ }
}
```

## Autopilot Endpoints

### Get Autopilot Settings
**GET** `/autopilot/settings/:accountId`

Get autopilot settings for an account.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "autoPostEnabled": true,
    "postsPerDay": 3,
    "preferredHours": [9, 14, 19],
    "useOptimalTiming": true,
    "contentResearchEnabled": true,
    "postingStrategy": "moderate",
    "autoHashtags": true,
    "performancePrediction": true,
    "minPredictedScore": 50
  }
}
```

### Update Autopilot Settings
**PUT** `/autopilot/settings/:accountId`

Update autopilot configuration.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "autoPostEnabled": true,
  "postsPerDay": 5,
  "postingStrategy": "aggressive",
  "contentResearchEnabled": true,
  "autoHashtags": true
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* updated settings */ }
}
```

### Research Trends
**POST** `/autopilot/trends/research`

AI-powered trend research.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "category": "technology"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "topic": "AI in Social Media",
      "category": "technology",
      "description": "...",
      "trendScore": 95,
      "suggestedHashtags": ["#AI", "#SocialMedia"],
      "relatedTopics": ["ML", "Automation"],
      "contentSuggestion": "..."
    }
  ]
}
```

### Get Trends
**GET** `/autopilot/trends`

Get trending topics.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `category` (optional) - Filter by category
- `minScore` (optional) - Minimum trend score

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ /* trends array */ ]
}
```

### Generate Content Ideas
**POST** `/autopilot/content/generate`

Generate AI content ideas.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "topic": "Social media marketing tips",
  "targetAudience": "small business owners",
  "contentType": "post"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "ideas": [
      {
        "title": "5 Quick Social Media Tips",
        "caption": "Full caption text...",
        "hashtags": ["#Marketing", "#SmallBusiness"],
        "bestPostingTime": "9:00 AM",
        "expectedEngagement": 85
      }
    ]
  }
}
```

### Predict Performance
**POST** `/autopilot/content/predict`

Predict post performance.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Your post content here",
  "hashtags": ["#Marketing", "#Business"],
  "historicalData": { /* optional */ }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "performanceScore": 78,
    "predictedReach": 5000,
    "predictedEngagement": 250,
    "recommendations": ["Post at 9 AM", "Add more hashtags"]
  }
}
```

### Generate Hashtags
**POST** `/autopilot/hashtags/generate`

Generate relevant hashtags.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "content": "Your post content",
  "niche": "marketing"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    "#Marketing",
    "#DigitalMarketing",
    "#SocialMedia",
    "#ContentMarketing"
  ]
}
```

### Schedule Auto Posts
**POST** `/autopilot/schedule/:accountId`

Automatically schedule posts based on trends.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [ /* scheduled posts array */ ]
}
```

### Get Scheduled Posts
**GET** `/autopilot/scheduled`

Get all scheduled posts.

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `accountId` (optional) - Filter by account
- `status` (optional) - Filter by status

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "Post content",
      "contentType": "post",
      "scheduledFor": "2024-01-20T09:00:00Z",
      "status": "pending",
      "hashtags": ["#Marketing"]
    }
  ]
}
```

### Create Scheduled Post
**POST** `/autopilot/scheduled`

Manually create a scheduled post.

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "facebookAccountId": "account_uuid",
  "content": "Your post content",
  "contentType": "post",
  "mediaUrls": ["https://..."],
  "hashtags": ["#Marketing"],
  "scheduledFor": "2024-01-20T09:00:00Z"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": { /* created post */ }
}
```

### Cancel Scheduled Post
**DELETE** `/autopilot/scheduled/:postId`

Cancel a pending scheduled post.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": { /* updated post with cancelled status */ }
}
```

### Get Optimal Posting Times
**GET** `/autopilot/optimal-times/:accountId`

Get AI-suggested optimal posting times.

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "weekday": [9, 12, 15, 19, 21],
    "weekend": [10, 14, 19, 20],
    "best": [9, 15, 19]
  }
}
```

## Error Responses

All endpoints may return error responses in this format:

**Response:** `4xx` or `5xx`
```json
{
  "success": false,
  "error": "Error message description"
}
```

Common error codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

## Rate Limiting

- Default: 100 requests per 15 minutes per IP
- Configurable via environment variables
- Exceeded limit returns `429 Too Many Requests`

## Pagination

For endpoints that support pagination, use query parameters:
- `limit` - Number of items per page (default: 50)
- `offset` - Number of items to skip

## Webhooks (Future)

Webhook support for real-time events will be added in future versions.

## SDK Support (Future)

Official SDKs for JavaScript, Python, and PHP coming soon.
