# 10xCards

![Version](https://img.shields.io/badge/version-0.0.1-blue)
![Node](https://img.shields.io/badge/node-22.14.0-brightgreen)
![License](https://img.shields.io/badge/license-TBD-lightgrey)

## Table of contents

- [Project name](#project-name)
- [Project description](#project-description)
- [Tech stack](#tech-stack)
- [Getting started locally](#getting-started-locally)
- [Available scripts](#available-scripts)
- [Testing](#testing)
- [Project scope](#project-scope)
- [Project status](#project-status)
- [License](#license)

## Project name

10xCards (package name: `10x-medi-cards`)

## Project description

10xCards is a web app for medical students to quickly create and study flashcards. It supports AI-assisted flashcard generation from pasted text, manual flashcard creation, and full flashcard management (browse, edit, delete). Each flashcard is scheduled for review using a spaced-repetition algorithm, with cards stored in a question/answer or front/back format. The MVP prioritizes fast AI generation with accurate, editable content and automated review scheduling.

Additional documentation:

- `./.ai/prd.md`
- `./.ai/tech-stack.md`

## Tech stack

Frontend:

- Astro 5
- React 19
- TypeScript 5
- Tailwind CSS 4
- Shadcn/ui

Backend:

- Supabase (PostgreSQL + Auth + SDK)

AI:

- Openrouter.ai (multi-model access and cost controls)

CI/CD & Hosting:

- GitHub Actions
- DigitalOcean (Docker-based deployment)

## Getting started locally

Prerequisites:

- Node.js `22.14.0` (from `.nvmrc`)
- npm (bundled with Node.js)

Setup:

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```
4. Preview the production build locally:
   ```bash
   npm run preview
   ```

## Available scripts

Development:
- `npm run dev` — start Astro dev server
- `npm run build` — build the production bundle
- `npm run preview` — preview the production build
- `npm run astro` — run the Astro CLI

Code Quality:
- `npm run lint` — run ESLint
- `npm run lint:fix` — fix ESLint issues
- `npm run format` — format files with Prettier

Testing:
- `npm test` — run all unit tests
- `npm test -- --watch` — run tests in watch mode
- `npm run test:ui` — open Vitest UI in browser
- `npm run test:coverage` — generate coverage report

## Testing

The project includes comprehensive unit tests covering critical business logic, algorithms, and components.

### Quick Start

```bash
# Run all tests
npm test

# Watch mode (auto-reload on changes)
npm test -- --watch

# UI mode (visual test runner)
npm run test:ui

# Coverage report
npm run test:coverage
```

### Test Coverage

- **52 unit tests** across 3 test files
- Testy pokrywają kluczową logikę biznesową (algorytm SM-2, generacja, storage)

### Priority Areas

1. **Priority 1 (Critical):** 20 tests
   - SM-2 spaced repetition algorithm

2. **Priority 2 (High):** 14 tests
   - Flashcard generation helpers

3. **Priority 3 (Medium):** 18 tests
   - Review storage (sessionStorage)

### Documentation

- **Setup Guide:** [`TESTING_SETUP.md`](./TESTING_SETUP.md)
- **Test Summary:** [`TEST_SUMMARY.md`](./TEST_SUMMARY.md)
- **Detailed Docs:** [`src/test/README.md`](./src/test/README.md)

### Technologies

- **Vitest** - Fast unit test framework
- **React Testing Library** - Testing React hooks
- **jsdom** - DOM environment for tests

## Project scope

In scope for MVP (2–3 sprints):

- AI flashcard generation from pasted text (limit 1000 chars, max 30 seconds)
- Manual flashcard creation
- Flashcard management: list, inline edit, delete
- User accounts: sign up, login, logout, password reset
- Spaced repetition scheduling and review flow
- Languages: PL and EN

Out of scope for MVP:

- Decks, categories, advanced filtering
- Bulk accept/reject and regeneration of single cards
- Source preview, error reporting, quality telemetry
- Marketplace, sharing, and external imports
- Native mobile apps
- Payments and subscriptions
- Advanced roles and multi-user authorization

Operational constraints and risks:

- Input limit: 1000 characters; generation time: up to 30 seconds
- Quality risk: AI content accuracy requires fast inline editing
- UX risk: long generation needs clear loading and retry states

## Project status

MVP is defined in the PRD; implementation progress is not specified in the provided files.

## License

License has not been specified yet. Add a license file and update this section when decided.
