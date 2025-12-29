# Facebook Earnings Management Platform with Autopilot

A comprehensive full-stack platform for managing Facebook/Instagram earnings with AI-powered autopilot features for content research, auto-posting, and performance optimization.

## Features

### Core Features

#### 1. User Authentication & Account Management
- ✅ Email/password authentication with JWT
- ✅ Facebook OAuth integration
- ✅ Multi-account support
- ✅ Secure password hashing with bcrypt
- ✅ User profile management

#### 2. Dashboard & Analytics
- ✅ Real-time earnings overview
- ✅ Revenue analytics with interactive charts (Recharts)
- ✅ Performance metrics by content type
- ✅ Daily/weekly/monthly/yearly reporting
- ✅ Engagement statistics
- ✅ Growth tracking

#### 3. Facebook Integration
- ✅ Facebook Graph API v18.0 integration
- ✅ OAuth authentication flow
- ✅ Auto-sync content and earnings data
- ✅ Monetization status tracking
- ✅ Page management
- ✅ Video and post insights
- ✅ Real-time account data pulling

#### 4. Earnings Management
- ✅ Track earnings by content type (videos, posts, live, stories)
- ✅ Daily/weekly/monthly earnings breakdown
- ✅ Revenue forecasting
- ✅ Payment history & transaction logs
- ✅ Multi-currency support (USD default)
- ✅ Detailed transaction tracking
- ✅ Content-level earnings attribution

#### 5. Content Management
- ✅ View all linked content (posts, videos, reels)
- ✅ Monitor monetized content performance
- ✅ Individual content earnings tracking
- ✅ Analytics per content piece
- ✅ Content categorization and tagging

#### 6. Autopilot Features

##### Auto-Post Engine
- ✅ Schedule automatic content posting
- ✅ Optimal posting time suggestions
- ✅ Auto-post based on performance patterns
- ✅ Content queue management
- ✅ Scheduled post execution via cron jobs

##### Content Research & Suggestions
- ✅ AI-powered trend research using OpenAI GPT-4
- ✅ Topic recommendations based on trending content
- ✅ Content gap analysis
- ✅ Viral trend detection (score-based ranking)
- ✅ Hashtag suggestions (10-15 per content)
- ✅ Caption optimization

##### Success Optimization
- ✅ Predict post performance before publishing
- ✅ Auto-adjust posting times for max engagement
- ✅ Content type recommendations
- ✅ Performance prediction scoring (1-100)
- ✅ Success rate tracking
- ✅ ROI optimization per content type

### Technical Stack

#### Frontend
- **Framework:** React 18 with TypeScript
- **Styling:** Tailwind CSS
- **State Management:** Zustand for global state
- **Data Fetching:** TanStack Query (React Query)
- **Charts:** Recharts
- **Routing:** React Router v6
- **Forms:** React Hook Form with Zod validation
- **Notifications:** React Toastify

#### Backend
- **Runtime:** Node.js 18+
- **Framework:** Express with TypeScript
- **Database:** PostgreSQL with Sequelize ORM
- **Cache/Jobs:** Redis + Bull queues
- **Authentication:** JWT + Passport.js
- **OAuth:** Passport Facebook Strategy
- **Scheduled Jobs:** node-cron
- **AI Integration:** OpenAI GPT-4 API
- **Email:** SendGrid
- **Payments:** Stripe (ready for integration)
- **Cloud Storage:** AWS S3 (ready for integration)

#### Infrastructure
- **Containerization:** Docker & Docker Compose
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Reverse Proxy:** Ready for Nginx
- **Environment:** dotenv for configuration

## Architecture

```
facebook-earnings-platform/
├── packages/
│   ├── backend/
│   │   ├── src/
│   │   │   ├── config/         # Database, Redis config
│   │   │   ├── controllers/    # Route controllers
│   │   │   ├── middleware/     # Auth, validation middleware
│   │   │   ├── models/         # Sequelize models
│   │   │   ├── routes/         # Express routes
│   │   │   ├── services/       # Business logic
│   │   │   ├── jobs/           # Cron jobs
│   │   │   └── index.ts        # Server entry point
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── frontend/
│       ├── public/
│       ├── src/
│       │   ├── components/     # React components
│       │   ├── pages/          # Page components
│       │   ├── services/       # API services
│       │   ├── store/          # Zustand stores
│       │   ├── App.tsx
│       │   └── index.tsx
│       ├── Dockerfile
│       ├── package.json
│       └── tailwind.config.js
│
├── docker-compose.yml
├── package.json
├── .env.example
└── README.md
```

## Database Schema

### Users Table
- id (UUID, PK)
- email (unique)
- password (hashed)
- firstName, lastName
- role (user/admin)
- twoFactorEnabled, twoFactorSecret
- isActive
- lastLogin
- timestamps

### FacebookAccounts Table
- id (UUID, PK)
- userId (FK)
- facebookId (unique)
- name
- accessToken (encrypted)
- pageId, pageName, pageAccessToken
- permissions (JSONB)
- monetizationEnabled
- isActive
- metadata (JSONB)
- timestamps

### Contents Table
- id (UUID, PK)
- facebookAccountId (FK)
- contentId (Facebook content ID)
- contentType (post/video/reel/story/live)
- title, description
- thumbnailUrl, contentUrl
- isMonetized
- category, tags
- publishedAt
- timestamps

### Earnings Table
- id (UUID, PK)
- facebookAccountId (FK)
- contentId (FK, optional)
- amount (decimal)
- currency
- earningType (ad_revenue/fan_subscription/stars/bonus/other)
- earningDate
- status (pending/completed/failed)
- transactionId
- metadata (JSONB)
- timestamps

### Analytics Table
- id (UUID, PK)
- contentId (FK)
- views, likes, comments, shares, clicks
- engagementRate, reach, impressions
- averageWatchTime, completionRate
- date
- timestamps

### ScheduledPosts Table
- id (UUID, PK)
- userId (FK)
- facebookAccountId (FK)
- content (text)
- contentType
- mediaUrls, hashtags
- scheduledFor
- status (pending/processing/published/failed/cancelled)
- publishedContentId
- errorMessage
- timestamps

### AutopilotSettings Table
- id (UUID, PK)
- userId (FK)
- facebookAccountId (FK)
- autoPostEnabled
- postsPerDay, preferredHours
- useOptimalTiming
- contentResearchEnabled
- targetTopics, excludedTopics
- postingStrategy (conservative/moderate/aggressive)
- autoHashtags, performancePrediction
- minPredictedScore
- advancedSettings (JSONB)
- timestamps

### TrendResearch Table
- id (UUID, PK)
- topic, category
- description
- trendScore (1-100)
- suggestedHashtags
- relatedTopics
- contentSuggestion
- validUntil
- timestamps

## Setup Instructions

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15 (or use Docker)
- Redis 7 (or use Docker)

### Environment Variables

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure required variables:
```env
# Database
DATABASE_URL=postgresql://fbuser:fbpass123@localhost:5432/fb_earnings

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret
FACEBOOK_CALLBACK_URL=http://localhost:3001/api/auth/facebook/callback

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Optional: Email, Stripe, AWS
SENDGRID_API_KEY=your-sendgrid-key
STRIPE_SECRET_KEY=your-stripe-key
AWS_ACCESS_KEY_ID=your-aws-key
```

### Installation

#### Option 1: Docker (Recommended)

```bash
# Start all services
npm run docker:up

# Stop all services
npm run docker:down
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- PostgreSQL: localhost:5432
- Redis: localhost:6379

#### Option 2: Local Development

```bash
# Install dependencies
npm install

# Start backend
npm run dev:backend

# Start frontend (in another terminal)
npm run dev:frontend

# Run database migrations
npm run db:migrate
```

### Facebook App Setup

1. Create a Facebook App at https://developers.facebook.com
2. Add Facebook Login product
3. Add required permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
   - `pages_read_user_content`
4. Set OAuth redirect URI: `http://localhost:3001/api/auth/facebook/callback`
5. Copy App ID and Secret to `.env`

### OpenAI Setup

1. Get API key from https://platform.openai.com
2. Add to `.env` as `OPENAI_API_KEY`
3. Ensure GPT-4 access is enabled

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile
- `PUT /api/auth/password` - Update password

### Facebook Accounts
- `POST /api/facebook/connect` - Connect Facebook account
- `GET /api/facebook/accounts` - Get all connected accounts
- `POST /api/facebook/:accountId/sync` - Sync account data
- `GET /api/facebook/:accountId/monetization` - Get monetization status
- `PUT /api/facebook/:accountId/page` - Update page info

### Earnings
- `GET /api/earnings` - Get all earnings (with filters)
- `GET /api/earnings/summary` - Get earnings summary
- `GET /api/earnings/content/:contentId` - Get earnings by content
- `POST /api/earnings` - Create earning record

### Autopilot
- `GET /api/autopilot/settings/:accountId` - Get autopilot settings
- `PUT /api/autopilot/settings/:accountId` - Update settings
- `POST /api/autopilot/trends/research` - Research new trends
- `GET /api/autopilot/trends` - Get trending topics
- `POST /api/autopilot/content/generate` - Generate content ideas
- `POST /api/autopilot/content/predict` - Predict post performance
- `POST /api/autopilot/hashtags/generate` - Generate hashtags
- `POST /api/autopilot/schedule/:accountId` - Schedule auto posts
- `GET /api/autopilot/scheduled` - Get scheduled posts
- `POST /api/autopilot/scheduled` - Create scheduled post
- `DELETE /api/autopilot/scheduled/:postId` - Cancel scheduled post
- `GET /api/autopilot/optimal-times/:accountId` - Get optimal posting times

## Usage Guide

### 1. Getting Started

1. Register an account at http://localhost:3000/register
2. Login with your credentials
3. Connect your Facebook account from the Accounts page
4. Select a Facebook Page to manage

### 2. Viewing Earnings

- Navigate to Dashboard for overview
- Go to Earnings page for detailed transaction history
- Filter by date range, account, or earning type
- View charts and analytics

### 3. Setting Up Autopilot

1. Go to Autopilot page
2. Select a Facebook account
3. Enable autopilot
4. Configure settings:
   - Posts per day
   - Posting strategy
   - Enable content research
   - Enable auto hashtags
   - Enable performance prediction

### 4. Using Autopilot Features

#### Research Trends
- Click "Research New Trends" button
- AI will analyze current trends
- Trends displayed with scores and hashtags

#### Generate Content
- Enter a topic
- Click "Generate Content Ideas"
- Get 3 AI-generated content ideas with captions

#### Generate Hashtags
- Enter your content text
- Click "Generate Hashtags"
- Get 10-15 relevant hashtags

#### Schedule Auto Posts
- Click "Schedule Auto Posts"
- System will automatically create posts based on trending topics
- Posts scheduled at optimal times

### 5. Managing Scheduled Posts

- View all scheduled posts
- See status (pending/published/failed)
- Cancel pending posts if needed

## Scheduled Jobs

The platform runs automated jobs:

- **Scheduled Post Publisher** - Runs every 5 minutes
  - Checks for posts due to be published
  - Publishes to Facebook
  - Updates status

## Development

### Running Tests
```bash
npm test
```

### Linting
```bash
npm run lint
```

### Building
```bash
# Build both frontend and backend
npm run build

# Build individually
npm run build:backend
npm run build:frontend
```

## Deployment

### Production Build

```bash
# Build production images
docker-compose -f docker-compose.yml build

# Start production services
docker-compose -f docker-compose.yml up -d
```

### Environment Variables for Production

Make sure to set secure values for:
- `JWT_SECRET` - Strong random string
- `DATABASE_URL` - Production database
- `REDIS_URL` - Production Redis
- All API keys and secrets

### Recommended Production Setup

1. Use managed PostgreSQL (AWS RDS, Heroku Postgres)
2. Use managed Redis (AWS ElastiCache, Redis Cloud)
3. Set up SSL/TLS certificates
4. Configure CORS for production domain
5. Enable rate limiting
6. Set up monitoring and logging
7. Configure backup strategy

## Security Considerations

- ✅ Passwords hashed with bcrypt
- ✅ JWT tokens for authentication
- ✅ HTTP-only cookies option
- ✅ Helmet.js for security headers
- ✅ CORS configured
- ✅ Rate limiting enabled
- ✅ Input validation
- ✅ SQL injection prevention (Sequelize ORM)
- ✅ XSS protection

## Performance Optimization

- ✅ Redis caching
- ✅ Database indexing
- ✅ Query optimization
- ✅ Connection pooling
- ✅ Lazy loading
- ✅ Code splitting (React)

## Future Enhancements

- [ ] Admin panel for platform management
- [ ] Instagram direct integration
- [ ] Advanced analytics with ML predictions
- [ ] Export earnings to PDF/Excel
- [ ] Email notifications for earnings
- [ ] Mobile app (React Native)
- [ ] Webhook support
- [ ] Multi-language support
- [ ] Dark mode
- [ ] Advanced reporting

## Troubleshooting

### Database Connection Issues
```bash
# Check PostgreSQL is running
docker ps | grep postgres

# Check logs
docker logs fb-earnings-postgres
```

### Redis Connection Issues
```bash
# Check Redis is running
docker ps | grep redis

# Test connection
redis-cli ping
```

### Facebook API Issues
- Verify App ID and Secret
- Check permissions are granted
- Ensure OAuth redirect URI is correct
- Check access token expiry

### OpenAI API Issues
- Verify API key is valid
- Check account has GPT-4 access
- Monitor rate limits

## Support

For issues, questions, or contributions:
1. Check documentation
2. Review error logs
3. Check environment variables
4. Verify external service status

## License

MIT License - See LICENSE file for details

## Acknowledgments

- Facebook Graph API
- OpenAI GPT-4
- React & TypeScript community
- Node.js ecosystem

---

Built with ❤️ for content creators and marketers
