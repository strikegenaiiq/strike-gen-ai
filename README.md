# STRIKE GEN AI

Production-ready AI creator platform for generating professional videos, images, audio, and creative content from prompts. Built with a creator workspace, AI tools, subscriptions, credit-based billing, and an admin dashboard.

---

## Overview

STRIKE GEN AI is an enterprise-grade platform designed to empower content creators with AI-powered tools. Users can generate high-quality videos, images, audio, and creative content directly from text prompts. The platform features flexible subscription models, transparent credit-based billing, and comprehensive creator workspaces with an intuitive admin dashboard.

**Target Users:**
- Content creators and influencers
- Marketing teams and agencies
- Video producers
- Digital artists
- Enterprises requiring bulk content generation

---

## Features

- **AI Content Generation**
  - Video generation from prompts
  - Image synthesis and editing
  - Audio creation and synthesis
  - Multi-modal content generation

- **Creator Workspace**
  - Project management
  - Asset library and organization
  - Collaboration tools
  - Version history and recovery

- **Subscription Management**
  - Flexible subscription tiers
  - Credit-based usage system
  - Usage analytics and reporting
  - Automatic tier upgrades

- **Billing & Payments**
  - Secure payment processing
  - Multiple payment methods
  - Invoice generation
  - Transparent pricing

- **Admin Dashboard**
  - User management
  - Platform analytics
  - Content moderation
  - System monitoring
  - Revenue reporting

- **Security & Compliance**
  - Role-based access control (RBAC)
  - Data encryption
  - API key management
  - Audit logging

---

## Architecture

The platform follows a modern, scalable architecture:

```
┌─────────────────┐
│   Next.js App   │ (Frontend + API Routes)
├─────────────────┤
│   Supabase      │ (Auth, Database, Realtime)
├─────────────────┤
│  AI Providers   │ (Runway, Replicate, etc.)
├─────────────────┤
│ Payment Gateway │ (Flutterwave)
└─────────────────┘
```

For detailed architecture documentation, see [docs/architecture.md](docs/architecture.md).

---

## Technology Stack

### Frontend & Framework
- **Next.js** - React framework with server-side rendering
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **React Query** - Data fetching and caching

### Backend & Database
- **Supabase** - PostgreSQL database, authentication, realtime subscriptions
- **Node.js** - Runtime environment
- **RESTful APIs** - API design pattern

### AI & Content Generation
- **Runway** - Video generation and editing
- **Replicate** - AI model inference
- **Additional AI providers** - Extensible architecture

### Payment Processing
- **Flutterwave** - Payment gateway for African markets
- **Webhooks** - Event-driven payment handling

### DevOps & Infrastructure
- **GitHub Actions** - CI/CD automation
- **Docker** - Containerization
- **PostgreSQL** - Primary database

### Development Tools
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Jest** - Testing framework
- **Git** - Version control

---

## Repository Structure

```
strike-gen-ai/
├── .github/
│   ├── copilot-instructions.md
│   └── workflows/
│       ├── lint.yml
│       ├── test.yml
│       ├── build.yml
│       ├── security.yml
│       ├── deploy-staging.yml
│       ├── deploy-production.yml
│       ├── docs-check.yml
│       └── release.yml
├── docs/
│   ├── architecture.md
│   ├── roadmap.md
│   ├── database.md
│   ├── api.md
│   ├── deployment.md
│   ├── security.md
│   ├── branding.md
│   ├── contributing.md
│   └── changelog.md
├── src/
│   ├── app/           # Next.js app directory
│   ├── components/    # Reusable React components
│   ├── lib/           # Utilities and helpers
│   ├── pages/         # API routes and legacy pages
│   ├── styles/        # Global styles
│   ├── types/         # TypeScript type definitions
│   └── utils/         # Helper functions
├── public/            # Static assets
├── tests/             # Test files
├── .env.example       # Environment variables template
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
├── next.config.js     # Next.js configuration
├── tailwind.config.js # Tailwind CSS configuration
└── README.md          # This file
```

---

## Installation

### Prerequisites
- Node.js 18+ or higher
- npm or yarn package manager
- Git

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/strikegenaiiq/strike-gen-ai.git
   cd strike-gen-ai
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` with your configuration (see below).

4. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

### Supabase
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### AI Providers - Runway
```
RUNWAY_API_KEY=your-runway-api-key
RUNWAY_WEBHOOK_SECRET=your-runway-webhook-secret
```

### AI Providers - Replicate
```
REPLICATE_API_TOKEN=your-replicate-api-token
```

### Payment Processing - Flutterwave
```
FLUTTERWAVE_PUBLIC_KEY=your-flutterwave-public-key
FLUTTERWAVE_SECRET_KEY=your-flutterwave-secret-key
NEXT_PUBLIC_FLUTTERWAVE_ENVIRONMENT=staging
```

### Application
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

### Optional - Analytics & Monitoring
```
NEXT_PUBLIC_ANALYTICS_ID=your-analytics-id
SENTRY_DSN=your-sentry-dsn
```

**Note:** Never commit `.env.local` to version control. Use `.env.example` as a template.

---

## Deployment

### Development
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker build -t strike-gen-ai .
docker run -p 3000:3000 --env-file .env.local strike-gen-ai
```

For detailed deployment instructions, see [docs/deployment.md](docs/deployment.md).

---

## AI Providers

### Runway
- **Purpose:** Video generation, editing, and enhancement
- **API:** RESTful with webhook support
- **Pricing:** Credit-based model
- **Documentation:** [runway.com/docs](https://runway.com/docs)

### Replicate
- **Purpose:** Image generation, processing, and AI model inference
- **API:** RESTful with async job handling
- **Pricing:** Per-prediction billing
- **Documentation:** [replicate.com/docs](https://replicate.com/docs)

### Additional Providers
The architecture supports integration with additional AI providers. See [docs/api.md](docs/api.md) for extensibility guidelines.

---

## Payment Providers

### Flutterwave
- **Purpose:** Secure payment processing for African markets
- **Payment Methods:** Card, Mobile Money, Bank Transfer, USSD
- **Currencies:** Multiple African currencies supported
- **Webhooks:** Real-time payment status updates
- **Documentation:** [flutterwave.com/developers](https://flutterwave.com/developers)

### Integration Flow
1. User initiates payment
2. Payment redirected to Flutterwave
3. Webhook notifies platform of payment status
4. Credits added to user account upon confirmation

---

## Roadmap

See [docs/roadmap.md](docs/roadmap.md) for the complete development roadmap, including:
- Upcoming features
- Timeline and milestones
- Priority features
- Future enhancements

---

## Contributing

We welcome contributions from the community. Please review our [Contributing Guidelines](docs/contributing.md) for:
- Development setup
- Code standards
- Pull request process
- Commit conventions
- Testing requirements

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

## Support

For issues, questions, or feature requests:
- **Issues:** [GitHub Issues](https://github.com/strikegenaiiq/strike-gen-ai/issues)
- **Discussions:** [GitHub Discussions](https://github.com/strikegenaiiq/strike-gen-ai/discussions)

---

## Changelog

See [docs/changelog.md](docs/changelog.md) for release notes and version history.

---

**Built with ❤️ by the STRIKE GEN AI Team**
