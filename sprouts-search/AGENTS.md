# Agent Development Guidelines for Sprouts Search

## Pre-Commit Checklist

**Before committing and pushing to a PR, you MUST:**

1. **Run lint:** `npm run lint`
   - Fix all linting errors before proceeding
   - Use `npm run lint:fix` for auto-fixable issues

2. **Run unit tests:** `npm test`
   - All unit tests must pass
   - Unit tests run fast and don't require Chrome/CDP

3. **Run E2E integration tests:** `npm run test:integration`
   - **CRITICAL:** Integration tests validate real browser automation
   - Requires Chrome running with `--remote-debugging-port=9222`
   - These tests catch issues that unit tests cannot

4. **Fix errors immediately:**
   - If any test fails, **debug and fix before pushing**
   - Do not push failing tests to the PR
   - Document findings in knowledge-base.md if you discover new edge cases

## Why This Matters

Integration tests for browser automation are particularly fragile:
- Websites change their UI/behavior frequently
- Headless Chrome behaves differently than headed mode
- React event systems require specific event synthesis
- Network timing issues can cause intermittent failures

**Running all three test types locally ensures:**
- Code quality (lint)
- Logic correctness (unit tests)
- Real-world functionality (integration tests)

## Development Workflow

```bash
# 1. Make your changes
vim scripts/sprouts-set-store.ts

# 2. Run the full test suite
npm run lint
npm test
npm run test:integration

# 3. Fix any errors
npm run lint:fix  # for lint issues
# Debug and fix test failures

# 4. Only after all tests pass:
git add .
git commit -m "Your commit message"
git push
```

## Debugging Integration Test Failures

If integration tests fail:
1. Check screenshots in test output
2. Run with headed Chrome to see what's happening
3. Review knowledge-base.md for known issues
4. Document new findings in knowledge-base.md
5. Update tests to handle new edge cases

## Known Issues

See [knowledge-base.md](knowledge-base.md) for:
- Onboarding modal handling
- React synthetic event requirements
- Map popup rendering in headless mode
- Store selection verification strategies
