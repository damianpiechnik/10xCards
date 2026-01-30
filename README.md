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

10xCards is a web app for medical students to quickly create and study flashcards. It supports AI-assisted flashcard generation from pasted text, manual flashcard creation, and flashcard management (browse, edit, delete). Each flashcard is scheduled for review using a spaced-repetition algorithm, with cards stored in a question/answer or front/back format.

The MVP prioritizes fast AI generation with editable content and automated review scheduling.

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

- OpenRouter.ai (multi-model access and cost controls)

CI/CD & Hosting:

- GitHub Actions (pull request checks)
- DigitalOcean (Docker-based deployment)

## Getting started locally

Prerequisites:

- Node.js `22.14.0` (from `.nvmrc`)
- npm (bundled with Node.js)

Setup:

1. Install dependencies:
   npm install
2. Start the development server:
   npm run dev
3. Build for production:
   npm run build
4. Preview the production build locally:
   npm run preview

## Available scripts

Development:

- npm run dev — start Astro dev server
- npm run build — build the production bundle
- npm run preview — preview the production build
- npm run astro — run the Astro CLI

Code Quality:

- npm run lint — run ESLint
- npm run lint:fix — fix ESLint issues
- npm run format — format files with Prettier

Testing:

- npm test — run all unit tests
- npm test -- --watch — run tests in watch mode
- npm run test:ui — open Vitest UI in browser
- npm run test:coverage — generate coverage report

## Testing

The project includes unit tests covering critical business logic and algorithms.

Quick start:

- npm test
- npm test -- --watch
- npm run test:ui
- npm run test:coverage

Test coverage:

- 43 unit tests across 3 test files
- Coverage includes:
  - SM-2 spaced repetition algorithm
  - flashcard generation flow and error handling
  - review storage (sessionStorage)

Priority areas:

- Priority 1 (Critical): 20 tests — SM-2 algorithm
- Priority 2 (High): 5 tests — generation flow and errors
- Priority 3 (Medium): 18 tests — review storage

Documentation:

- TESTING_SETUP.md
- TEST_SUMMARY.md
- src/test/README.md

Technologies:

- Vitest
- React Testing Library (available)
- jsdom

## Project scope

In scope for MVP:

- AI flashcard generation from pasted text
- Manual flashcard creation
- Flashcard management (list, edit, delete)
- User accounts and authentication
- Spaced repetition review flow
- Languages: PL and EN

Out of scope for MVP:

- Decks and categories
- Bulk operations
- Marketplace and sharing
- Mobile apps
- Payments
- Advanced authorization

Operational constraints and risks:

- AI latency and limits depend on provider
- AI output requires user verification
- Long generation needs clear loading and retry states

## Project status

MVP is defined in the PRD; implementation is in progress.

## License

License has not been specified yet.
