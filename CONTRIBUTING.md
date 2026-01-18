# Contributing to PhotoScout

Thank you for your interest in contributing to PhotoScout! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js v20 (see `.nvmrc`)
- pnpm v9+
- AWS CLI configured (for deployment)

### Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy the environment file:
   ```bash
   cp .env.example .env
   ```
4. Start the development servers:
   ```bash
   pnpm dev:web   # Web frontend
   pnpm dev:api   # API backend
   ```

## Development Workflow

### Code Quality

This project uses automated quality tools:

- **ESLint** - Linting TypeScript/React code
- **Prettier** - Code formatting
- **TypeScript** - Type checking
- **Husky** - Pre-commit hooks

Before committing, your code will be automatically linted and formatted.

### Running Quality Checks Manually

```bash
pnpm lint          # Run ESLint
pnpm lint:fix      # Fix ESLint issues
pnpm format        # Format with Prettier
pnpm format:check  # Check formatting
pnpm typecheck     # Run TypeScript type check
pnpm test          # Run tests
```

### Project Structure

```
PhotoScout/
├── packages/
│   ├── web/      # React frontend (Vite + Tailwind)
│   ├── api/      # AWS Lambda handlers
│   └── shared/   # Shared types and utilities
├── infra/        # AWS CDK infrastructure
├── ios/          # Native iOS app (SwiftUI)
└── model-testing/ # LLM model testing framework
```

## Making Changes

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `docs/description` - Documentation updates
- `refactor/description` - Code refactoring

### Commit Messages

Follow conventional commit format:

```
type: brief description

- Detailed bullet points if needed
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

### Pull Requests

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass (`pnpm lint && pnpm typecheck && pnpm test`)
4. Push your branch and open a PR
5. Fill out the PR template
6. Wait for review

## Areas for Contribution

- Bug fixes and issue resolution
- Documentation improvements
- New destination data
- UI/UX enhancements
- Performance optimizations
- Test coverage improvements

## Code of Conduct

Please read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

## Questions?

Open a [discussion](https://github.com/vbolshakov87/PhotoScout/discussions) for questions or ideas.
