# STRIKE GEN AI

An enterprise-grade AI creator platform designed to empower content creators with intelligent tools for generating professional videos, images, audio, and creative content from prompts.

---

To democratize AI-powered content creation by providing creators, agencies, and enterprises with an intuitive, scalable platform that transforms ideas into professional-quality digital assets through simple prompts.

## Mission

Build a production-ready platform that combines cutting-edge AI technology with user-centric design to enable creators of all skill levels to produce high-quality content efficiently and affordably.

---

## Product Overview

STRIKE GEN AI is a comprehensive content creation platform that integrates multiple AI providers and payment systems to deliver a seamless experience for content creators. The platform enables users to:

- Generate diverse content types (videos, images, audio, creative assets)
- Manage projects and assets within personalized workspaces
- Subscribe to flexible usage tiers with transparent billing
- Track usage, analytics, and content performance
- Access an admin dashboard for platform management and user oversight

**Target Audience:**
- Individual content creators and influencers
- Marketing teams and creative agencies
- Video production studios
- Digital agencies and consulting firms
- Enterprises requiring bulk content generation capabilities

---

## Core Features (Planned)

### Content Generation
- AI-powered video generation from text prompts
- Image synthesis and manipulation
- Audio creation and voice synthesis
- Multi-modal content generation combining multiple asset types

### Creator Workspace
- Project management and organization
- Digital asset library and management
- Collaboration capabilities for team workflows
- Version history and content recovery

### Subscription & Billing
- Flexible subscription tier system
- Credit-based usage model for transparent pricing
- Usage analytics and consumption tracking
- Automated billing and invoice management

### Admin Dashboard
- User and account management
- Platform analytics and reporting
- Content moderation capabilities
- Revenue and business metrics tracking

### Security & Access Control
- User authentication and authorization
- Role-based access control (RBAC)
- Data security and privacy compliance
- API key management for integrations

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
│   ├── architecture.md          # System design and technical architecture
│   ├── roadmap.md               # Development timeline and milestones
│   ├── database.md              # Data modeling and schema planning
│   ├── api.md                   # API design and endpoints
│   ├── deployment.md            # Infrastructure and deployment strategy
│   ├── security.md              # Security architecture and compliance
│   ├── branding.md              # Brand guidelines and identity
│   ├── contributing.md          # Contribution guidelines and standards
│   └── changelog.md             # Version history and release notes
├──
# This file
|
README.md                 # Main project overview
LICENSE
CHANGELOG.md
CONTRIBUTING.md
SECURITY.md
CODE_OF_CONDUCT.md

AGENTS.md                 # Instructions for AI coding agents
CLAUDE.md                 # Claude-specific guidance (optional)
GEMINI.md                 # Gemini-specific guidance (optional)
COPILOT.md                # GitHub Copilot guidance (optional)

docs/
├── architecture.md
├── database-design.md
├── api-specification.md
├── deployment-strategy.md
├── security-architecture.md
├── ui-ux-design-system.md
├── feature-specifications.md
├── testing-strategy.md
├── business-model.md
├── user-flows.md
├── roadmap.md
└── contributing-guide.md
└── LICENSE                      # MIT License
```

## 🏗️ System Architecture

```text
Frontend
├── React + Vite
├── Tailwind CSS
└── AWS Amplify (Hosting)

Backend
├── Supabase Auth
├── PostgreSQL
├── Realtime
├── Edge Functions
└── Row Level Security (RLS)

Media Storage
├── Amazon S3
└── Amazon CloudFront

AI Providers
├── Google Veo
├── Runway
├── Replicate
├── OpenAI
└── ElevenLabs

Payments
└── Paystack

```

## Technology Stack

```

Frontend
├── React + Vite
├── Tailwind CSS
└── AWS Amplify

Backend
├── Supabase Auth
├── PostgreSQL
├── Realtime
├── Edge Functions
└── Row Level Security (RLS)

Media & CDN
├── Amazon S3
└── Amazon CloudFront

AI Providers
├── Google Veo
├── Runway
├── Replicate
├── OpenAI
└── ElevenLabs

Payments
└── Paystack

Monitoring (Future)
├── AWS CloudWatch
└── Sentry

---

## Environment Variables

Create a `.env.local` file (or `.env` for Vite) in the project root and configure the following variables:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

PAYSTACK_SECRET_KEY=

OPENAI_API_KEY=
REPLICATE_API_TOKEN=
GOOGLE_API_KEY=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
S3_BUCKET_NAME=
```

> **Important:** Never commit real API keys or secrets to GitHub.

## Tech Stack

Layer              Technology

Frontend           React + Vite

Styling            Tailwind CSS

Hosting            AWS Amplify

Backend            Supabase

Database           PostgreSQL

Authentication     Supabase Auth

Storage            Amazon S3

CDN                Amazon CloudFront

AI Models           Google Veo, 
            
                    Runway, 

                    Replicate,

                    OpenAI, 

                    ElevenLabs
          
Payments.           Paystack


````

## Documentation

Complete project documentation is maintained in the `docs/` directory:

- **[Architecture](docs/architecture.md)** - System design, component overview, and integration patterns
- **[Roadmap](docs/roadmap.md)** - Development timeline, milestones, and feature prioritization
- **[Database Planning](docs/database.md)** - Data models, schema design, and storage strategy
- **[API Planning](docs/api.md)** - API design, endpoints, and integration specification
- **[Deployment Strategy](docs/deployment.md)** - Infrastructure planning and deployment approach
- **[Security](docs/security.md)** - Security architecture, compliance, and data protection
- **[Branding](docs/branding.md)** - Brand identity, visual guidelines, and messaging
- **[Contributing](docs/contributing.md)** - Development standards and contribution process
- **[Changelog](docs/changelog.md)** - Version history and release notes

---

## Development Status

## 🚀 Current Phase: Active Development (MVP)

### ✅ Completed
- React + Vite application foundation
- Supabase PostgreSQL database schema
- Authentication and user profile system
- Row Level Security (RLS) policies
- Credit ledger architecture
- Payment integration foundation
- Project documentation and GitHub workflows

### 🚧 In Progress
- AI video generation pipeline
- AI image generation pipeline
- User dashboard
- Subscription and billing experience
- Credit consumption engine
- AWS S3 media storage integration
- AWS Amplify deployment
- Admin dashboard

### 📅 Planned
- AI Live Studio
- Team collaboration
- Public API
- Mobile application
- Enterprise features

## Contributing

We welcome contributions to the planning and design phases. Please review our [Contributing Guidelines](docs/contributing.md) for:

- Document contribution standards
- Planning process and feedback
- How to suggest features or improvements
- Design review procedures

---

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## Roadmap

For detailed information about planned features, milestones, and development timeline, please refer to the [Project Roadmap](docs/roadmap.md).

---

**STRIKE GEN AI** — Transforming creative vision into reality through intelligent automation.
