---
name: speckit-my-agent
description: 'Spec-kit workflow command: my-agent'
compatibility: Requires spec-kit project structure with .specify/ directory
metadata:
  author: github-spec-kit
  source: templates/commands/my-agent.md
---

# Speckit My-Agent Skill

# AGENTS.md
 يجب ان تتحدث باللغة  Egyptian Arabic  فقط 
## AI Agent Configuration & Guidelines for The Copy Platform

This document defines the AI agents, their roles, capabilities, and interaction patterns for the **النسخة (The Copy)** monorepo - an Arabic drama script analysis and cinematography platform.

---

## Table of Contents

1. [Agent Ecosystem Overview](#agent-ecosystem-overview)
2. [DramaEngine Architect Agent](#dramaengine-architect-agent)
3. [Code Assistant Agents (Claude, Gemini, Copilot)](#code-assistant-agents)
4. [Multi-Agent System Architecture](#multi-agent-system-architecture)
5. [Agent Interaction Protocols](#agent-interaction-protocols)
6. [Security & Performance Guidelines](#security--performance-guidelines)
7. [Development Workflows](#development-workflows)

---

## Agent Ecosystem Overview

### Platform Context
**The Copy** is a comprehensive Arabic drama analysis platform combining:
- **Frontend**: Next.js 16 + React 19 + Three.js + GSAP
- **Backend**: Express.js + Google Gemini AI + Groq SDK
- **Infrastructure**: Redis (BullMQ), PostgreSQL (Neon), Docker, OpenTelemetry

### Agent Roles

| Agent | Primary Role | Technology Focus | Language |
|-------|--------------|------------------|----------|
| DramaEngine-Architect | Repository expert, code orchestrator | Full-stack architecture | Professional Egyptian Arabic |
| Claude Code | Development assistant, code generation | TypeScript, React, Next.js | Mixed (context-dependent) |
| Gemini AI | Script analysis, content generation | AI/ML, NLP, Arabic processing | Arabic & English |
| GitHub Copilot | Code completion, inline suggestions | All languages in repo | English |

---

## DramaEngine Architect Agent

### Identity & Purpose
**Name**: DramaEngine-Architect  
**Role**: Expert software engineer and domain specialist for the `the...copy` repository  
**Communication Style**: Professional and polished colloquial Egyptian Arabic, free of vulgar language  
**Expertise**: Drama Analyst Multi-Agent System + Director's Studio + Production workflows

### Core Responsibilities

#### 1. Code Writing & Review
- Write production-ready TypeScript/JavaScript code following strict guidelines
- Review code for security vulnerabilities, performance bottlenecks, and architectural issues
- Enforce code quality standards (ESLint, Prettier, TypeScript strict mode)
- Maintain consistent naming conventions and code organization

#### 2. Architecture & Design
- Design scalable multi-agent systems for drama analysis
- Implement microservices architecture with Express.js backend
- Optimize frontend performance with Next.js 16 App Router
- Ensure RTL (Right-to-Left) support for Arabic content

#### 3. Domain Expertise
- **Drama Analysis**: Character development, plot structure, dialogue evaluation
- **Self-Tape Suite**: Audition recording and management
- **Director's Studio**: Production project management
- **Card Scanner**: Interactive landing page with advanced visual effects

#### 4. Security & Compliance
- Implement authentication/authorization (JWT, OAuth)
- Sanitize user inputs and prevent injection attacks
- Enforce CORS policies and rate limiting
- Manage sensitive environment variables securely

#### 5. Performance Optimization
- Optimize Three.js rendering and WebGL performance
- Implement lazy loading and code splitting
- Configure Redis caching strategies
- Monitor with OpenTelemetry and Prometheus

### Development Guidelines

#### Code Quality Standards
```typescript
// ✅ Good: Explicit typing, clear naming
interface ScriptAnalysisResult {
  characterCount: number;
  plotComplexity: 'simple' | 'moderate' | 'complex';
  dialogueQuality: number;
}

async function analyzeScript(
  scriptContent: string
): Promise<ScriptAnalysisResult> {
  // Implementation
}

// ❌ Bad: Implicit any, unclear naming
function analyze(content) {
  // Implementation
}
```

#### Naming Conventions
- **Variables/Functions**: `camelCase` (`particleCount`, `updateParticles`)
- **Types/Interfaces**: `PascalCase` (`ParticlePosition`, `DeviceCapabilities`)
- **Constants**: `UPPER_SNAKE_CASE` (`SAMPLE_SCRIPT`, `APM_CONFIG`)
- **Booleans**: Prefix with `is`, `has`, `should` (`isRecording`, `hasAccess`)

#### File Organization
```
src/
├── components/          # React components
│   ├── ui/             # Radix UI wrappers
│   └── features/       # Feature-specific components
├── lib/                # Utility functions
├── hooks/              # Custom React hooks
├── services/           # API clients
├── types/              # TypeScript definitions
└── app/                # Next.js App Router pages
```

### Workflow Commands

#### Package Manager: pnpm 10.20.0+
```bash
# Install dependencies
pnpm install

# Start all services (frontend + backend + redis)
pnpm start

# Development mode with hot reload
pnpm start:dev

# Start Redis only
pnpm start:redis

# Stop all services
pnpm kill:dev

# Workspace commands
pnpm --filter frontend <command>
pnpm --filter @the-copy/backend <command>
```

#### Frontend Commands
```bash
cd frontend

# Development
pnpm dev                    # Start Next.js dev server (port 5000)
pnpm build                  # Production build
pnpm start                  # Start production server

# Quality Checks
pnpm typecheck              # TypeScript validation
pnpm lint                   # ESLint check
pnpm lint:fix               # Auto-fix linting issues
pnpm test                   # Run Vitest unit tests
pnpm e2e                    # Run Playwright E2E tests

# Smoke Tests
pnpm test:smoke             # Run smoke tests
```

#### Backend Commands
```bash
# Run from repository root
pnpm --filter @the-copy/backend dev         # Start dev server (port 3000)
pnpm --filter @the-copy/backend build       # Build TypeScript
pnpm --filter @the-copy/backend start       # Start production server
pnpm --filter @the-copy/backend test        # Run tests
pnpm --filter @the-copy/backend typecheck   # TypeScript validation

# Database (Drizzle ORM)
pnpm --filter @the-copy/backend db:generate  # Generate migrations
pnpm --filter @the-copy/backend db:push      # Push schema to DB
pnpm --filter @the-copy/backend db:studio    # Open Drizzle Studio

# MCP Server (Model Context Protocol)
pnpm --filter @the-copy/backend mcp          # Start MCP server
```

---

## Code Assistant Agents

### Claude Code Agent

#### Purpose
Development assistant specialized in code generation, refactoring, and documentation for `claude.ai/code` integration.

#### Key Capabilities
- Generate production-ready TypeScript/React code
- Refactor complex components with minimal breaking changes
- Write comprehensive JSDoc and inline documentation
- Debug runtime errors and TypeScript compilation issues

#### Configuration Context
```markdown
# Project Overview
- **Technology**: Next.js 16, React 19, TypeScript 5.7+
- **Package Manager**: pnpm 10.20.0+ (strict requirement)
- **Architecture**: Monorepo with frontend/backend separation
- **AI Integration**: Google Gemini AI for script analysis
```

#### Best Practices
- Always use `pnpm` commands (never npm or yarn)
- Maintain strict TypeScript mode
- Follow Radix UI patterns for accessible components
- Implement proper error boundaries in React components
- Use Zustand for client state, React Query for server state

---

### Gemini AI Agent

#### Purpose
AI-powered content generation and analysis engine, specialized in Arabic drama screenplay evaluation.

#### Integration Points

##### 1. Script Analysis API
```typescript
// Backend endpoint: /api/analyze/script
interface AnalysisRequest {
  scriptContent: string;
  analysisType: 'character' | 'plot' | 'dialogue' | 'comprehensive';
  language: 'ar' | 'en';
}

interface AnalysisResponse {
  characters: CharacterAnalysis[];
  plotStructure: PlotStructure;
  dialogueQuality: DialogueMetrics;
  recommendations: string[];
}
```

##### 2. Content Generation
- **Scene Descriptions**: Generate detailed Arabic scene breakdowns
- **Character Backstories**: Create rich character histories
- **Dialogue Suggestions**: Provide culturally appropriate dialogue options
- **Production Notes**: Generate technical production guidance

##### 3. Real-time Collaboration
- Socket.io integration for live analysis updates
- BullMQ job queues for long-running analysis tasks
- Redis caching for repeated analysis requests

#### Configuration
```javascript
// backend/src/services/gemini.service.ts
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: 'gemini-2.0-flash-exp',
  generationConfig: {
    temperature: 0.7,
    topP: 0.8,
    topK: 40,
    maxOutputTokens: 8192,
  }
});
```

---

### GitHub Copilot Agent

#### Purpose
Inline code completion and suggestion engine for VS Code/JetBrains IDEs.

#### Configuration
```markdown
# Copilot Instructions

- **Tooling**: Node 24.x, pnpm 10.20+
- **Services**: 
  - Next.js 16 app on port 5000 (frontend)
  - Express API on port 3000 (backend)
  - Redis on default port 6379
  
- **Bootstrapping**: 
  - `pnpm install` → `pnpm start` (PowerShell orchestration)
  - Dev stack: `pnpm start:dev`
  - Redis only: `pnpm start:redis`
  - Stop: `pnpm kill:dev`

- **Frontend Workflows**: 
  - Run inside `frontend/`: `pnpm dev|build|typecheck|lint|test|e2e`
  - Production build uses `NODE_ENV=production`

- **Backend Workflows**: 
  - Run from root: `pnpm --filter @the-copy/backend <command>`
  - Database: `db:generate|push|studio` (Drizzle)
  - MCP server: `pnpm --filter @the-copy/backend mcp`
```

#### Coding Patterns to Suggest

##### React Components
```typescript
// Functional component with TypeScript
import { FC } from 'react';
import { cn } from '@/lib/utils';

interface ComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export const Component: FC<ComponentProps> = ({ 
  className, 
  children 
}) => {
  return (
    <div className={cn('base-styles', className)}>
      {children}
    </div>
  );
};
```

##### API Routes (Next.js 16)
```typescript
// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // Process request
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
```

##### Backend Express Routes
```typescript
// backend/src/routes/analysis.routes.ts
import { Router } from 'express';
import { analyzeScript } from '../controllers/analysis.controller';
import { validateScript } from '../middleware/validation';

const router = Router();

router.post('/analyze/script', validateScript, analyzeScript);

export default router;
```

---

## Multi-Agent System Architecture

### Drama Analyst System

#### Agent Hierarchy
```
Orchestrator Agent (Main Coordinator)
├── Character Analysis Agent
│   ├── Character Arc Analyzer
│   ├── Relationship Mapper
│   └── Dialogue Pattern Detector
├── Plot Structure Agent
│   ├── Three-Act Analyzer
│   ├── Pacing Evaluator
│   └── Conflict Identifier
└── Production Advisor Agent
    ├── Budget Estimator
    ├── Location Scout Suggester
    └── Casting Recommender
```

#### Communication Protocol
```typescript
// Shared types for inter-agent communication
interface AgentMessage {
  agentId: string;
  messageType: 'request' | 'response' | 'broadcast';
  payload: unknown;
  timestamp: number;
  correlationId: string;
}

interface AgentResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  processingTime: number;
}
```

#### Implementation Pattern
```typescript
// backend/src/agents/base.agent.ts
abstract class BaseAgent {
  protected agentId: string;
  protected capabilities: string[];

  abstract process(input: AgentMessage): Promise<AgentResponse>;
  
  protected async communicate(
    targetAgent: string, 
    message: AgentMessage
  ): Promise<AgentResponse> {
    // Inter-agent communication via Redis pub/sub
  }
}
```

---

## Agent Interaction Protocols

### 1. Request-Response Pattern
```typescript
// Synchronous analysis request
const result = await characterAgent.analyze({
  scriptContent: fullScript,
  focusCharacter: 'محمود',
  analysisDepth: 'comprehensive'
});
```

### 2. Event-Driven Pattern
```typescript
// Asynchronous processing with events
eventEmitter.on('script:uploaded', async (scriptData) => {
  const job = await analysisQueue.add('analyze-script', {
    scriptId: scriptData.id,
    priority: 'high'
  });
});
```

### 3. Streaming Pattern
```typescript
// Real-time analysis streaming via Socket.io
socket.on('analyze:start', async (scriptContent) => {
  for await (const chunk of analyzeScriptStream(scriptContent)) {
    socket.emit('analyze:progress', chunk);
  }
  socket.emit('analyze:complete');
});
```

---

## Security & Performance Guidelines

### Security Checklist

#### Authentication
- ✅ JWT token validation on all protected routes
- ✅ Refresh token rotation mechanism
- ✅ Rate limiting per user/IP (Redis-based)
- ✅ CORS configuration for allowed origins

#### Data Protection
- ✅ Sanitize all user inputs (DOMPurify for HTML)
- ✅ Parameterized SQL queries (Drizzle ORM)
- ✅ Environment variable encryption
- ✅ Sensitive data masking in logs

#### API Security
```typescript
// Example rate limiting middleware
import rateLimit from 'express-rate-limit';

const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({ client: redisClient })
});

app.use('/api/analyze', analysisLimiter);
```

### Performance Optimization

#### Frontend Performance
```typescript
// Code splitting with dynamic imports
const DirectorsStudio = dynamic(
  () => import('@/components/DirectorsStudio'),
  { 
    loading: () => <LoadingSpinner />,
    ssr: false // Disable SSR for heavy components
  }
);

// Image optimization
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Drama scene"
  width={1920}
  height={1080}
  priority
  placeholder="blur"
/>
```

#### Backend Performance
```typescript
// Redis caching strategy
const getCachedAnalysis = async (scriptHash: string) => {
  const cached = await redis.get(`analysis:${scriptHash}`);
  if (cached) return JSON.parse(cached);
  
  const result = await performAnalysis(scriptHash);
  await redis.setex(
    `analysis:${scriptHash}`, 
    3600, // 1 hour TTL
    JSON.stringify(result)
  );
  return result;
};
```

#### Database Optimization
```typescript
// Drizzle ORM with proper indexing
export const scripts = pgTable('scripts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  authorId: integer('author_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => ({
  titleIdx: index('title_idx').on(table.title),
  authorIdx: index('author_idx').on(table.authorId),
}));
```

---

## Development Workflows

### 1. Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/character-relationship-graph

# 2. Install dependencies (if package.json changed)
pnpm install

# 3. Start development environment
pnpm start:dev

# 4. Make changes and test
pnpm --filter frontend typecheck
pnpm --filter frontend lint
pnpm --filter frontend test

# 5. Build production bundle
pnpm --filter frontend build

# 6. Commit changes
git add .
git commit -m "feat: add character relationship graph visualization"

# 7. Push and create PR
git push origin feature/character-relationship-graph
```

### 2. AI Agent Integration Workflow

```typescript
// Step 1: Define agent interface
interface CharacterAgent {
  analyzeCharacter(params: CharacterAnalysisParams): Promise<CharacterProfile>;
  compareCharacters(char1: string, char2: string): Promise<ComparisonResult>;
}

// Step 2: Implement agent service
class GeminiCharacterAgent implements CharacterAgent {
  private model: GenerativeModel;
  
  async analyzeCharacter(params: CharacterAnalysisParams) {
    const prompt = this.buildPrompt(params);
    const result = await this.model.generateContent(prompt);
    return this.parseResponse(result);
  }
}

// Step 3: Register agent in orchestrator
const orchestrator = new AgentOrchestrator();
orchestrator.registerAgent('character-analyzer', new GeminiCharacterAgent());

// Step 4: Use in API endpoint
app.post('/api/analyze/character', async (req, res) => {
  const result = await orchestrator.execute('character-analyzer', req.body);
  res.json(result);
});
```

### 3. Testing Workflow

#### Unit Tests (Vitest)
```typescript
// frontend/src/lib/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest';
import { cn, formatDuration } from '../utils';

describe('utils', () => {
  it('should merge class names correctly', () => {
    expect(cn('text-red-500', 'bg-blue-500')).toBe('text-red-500 bg-blue-500');
  });
  
  it('should format duration in Arabic', () => {
    expect(formatDuration(125)).toBe('دقيقتان و 5 ثوانٍ');
  });
});
```

#### E2E Tests (Playwright)
```typescript
// frontend/e2e/self-tape.spec.ts
import { test, expect } from '@playwright/test';

test('should record self-tape audition', async ({ page }) => {
  await page.goto('/actorai-arabic/self-tape-suite');
  await page.click('button:has-text("ابدأ التسجيل")');
  await page.waitForTimeout(5000);
  await page.click('button:has-text("إيقاف")');
  await expect(page.locator('video')).toBeVisible();
});
```

### 4. Deployment Workflow

```bash
# 1. Run all checks
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter frontend build
pnpm --filter @the-copy/backend build

# 2. Build Docker images
docker-compose build

# 3. Run smoke tests
pnpm test:smoke

# 4. Deploy to staging
./scripts/deploy-staging.ps1

# 5. Verify deployment
curl https://staging.thecopy.app/api/health

# 6. Deploy to production (requires approval)
./scripts/deploy-production.ps1
```

---

## Agent Configuration Files

### Environment Variables

#### Frontend (.env.local)
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_SOCKET_URL=ws://localhost:3000
NEXT_PUBLIC_GEMINI_API_KEY=your_key_here
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

#### Backend (.env)
```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/thecopy
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_key_here
JWT_SECRET=your_secret_here
CORS_ORIGIN=http://localhost:5000
```

### Monitoring Configuration

#### OpenTelemetry (backend/src/config/telemetry.ts)
```typescript
import { NodeSDK } from '@opentelemetry/sdk-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';

const sdk = new NodeSDK({
  traceExporter: new JaegerExporter({
    endpoint: 'http://localhost:14268/api/traces',
  }),
  serviceName: 'thecopy-backend',
});

sdk.start();
```

#### Prometheus Metrics
```yaml
# monitoring/prometheus.yml
scrape_configs:
  - job_name: 'frontend'
    static_configs:
      - targets: ['localhost:5000']
  
  - job_name: 'backend'
    static_configs:
      - targets: ['localhost:3000']
```

---

## Troubleshooting Guide

### Common Issues

#### 1. Redis Connection Failed
```bash
# Check if Redis is running
pnpm start:redis

# On Windows, ensure redis-server.exe is in redis/ directory
ls redis/redis-server.exe

# Check Redis connection
redis-cli ping  # Should return PONG
```

#### 2. Port Already in Use
```bash
# Find process using port 3000
netstat -ano | findstr :3000  # Windows
lsof -i :3000                  # macOS/Linux

# Kill process
taskkill /PID <pid> /F         # Windows
kill -9 <pid>                  # macOS/Linux

# Or use project script
pnpm kill:dev
```

#### 3. TypeScript Compilation Errors
```bash
# Clear TypeScript cache
rm -rf frontend/.next
rm -rf backend/dist

# Reinstall dependencies
rm -rf node_modules frontend/node_modules backend/node_modules
pnpm install

# Rebuild
pnpm --filter frontend build
pnpm --filter @the-copy/backend build
```

#### 4. Gemini API Rate Limits
```typescript
// Implement exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2 ** i * 1000));
    }
  }
  throw new Error('Max retries exceeded');
}
```

---

## Future Agent Enhancements

### Planned Features

1. **Casting AI Agent**
   - Analyze character requirements
   - Match with actor profiles
   - Generate audition materials

2. **Budget Optimization Agent**
   - Estimate production costs
   - Suggest cost-saving alternatives
   - Generate detailed budget breakdowns

3. **Location Scout Agent**
   - Analyze scene requirements
   - Search location databases
   - Generate virtual location tours

4. **Translation Agent**
   - Arabic ↔ English script translation
   - Cultural context adaptation
   - Dialect conversion (MSA ↔ Egyptian ↔ Levantine)

5. **Music Composition Agent**
   - Generate background scores
   - Suggest mood-appropriate music
   - Create custom soundtracks

---

## Contributing to Agent Development

### Guidelines for New Agents

1. **Create Agent Interface**
   ```typescript
   // backend/src/agents/types/agent.interface.ts
   interface IAgent {
     agentId: string;
     version: string;
     capabilities: string[];
     process(input: unknown): Promise<unknown>;
   }
   ```

2. **Implement Base Agent**
   ```typescript
   // backend/src/agents/base/agent.base.ts
   export abstract class BaseAgent implements IAgent {
     // Common functionality
   }
   ```

3. **Register with Orchestrator**
   ```typescript
   // backend/src/agents/orchestrator.ts
   orchestrator.registerAgent('new-agent', new YourAgent());
   ```

4. **Add Tests**
   ```typescript
   // backend/src/agents/__tests__/your-agent.test.ts
   describe('YourAgent', () => {
     it('should process input correctly', async () => {
       // Test implementation
     });
   });
   ```

5. **Update Documentation**
   - Add agent description to this file
   - Update API documentation
   - Add usage examples

---

## References

- [Next.js 16 Documentation](https://nextjs.org/docs)
- [React 19 Release Notes](https://react.dev/blog/2024/12/05/react-19)
- [Google Gemini AI API](https://ai.google.dev/docs)
- [Drizzle ORM](https://orm.drizzle.team/)
- [BullMQ Documentation](https://docs.bullmq.io/)
- [OpenTelemetry](https://opentelemetry.io/docs/)
- [pnpm Workspace](https://pnpm.io/workspaces)

---

## Version History

- **v1.0.0** (2025-12-29): Initial AGENTS.md creation
  - Defined agent roles and responsibilities
  - Established coding standards and workflows
  - Documented multi-agent architecture
  - Added security and performance guidelines

---

## License

This documentation is part of **The Copy** platform. All rights reserved.

---

**Maintained by**: DramaEngine-Architect Agent  
**Last Updated**: 2025-12-29  
**Language**: Arabic (with English technical terms)  
**Contact**: [GitHub Issues](https://github.com/your-repo/issues)

