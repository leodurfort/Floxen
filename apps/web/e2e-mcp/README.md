# E2E Tests - Chrome DevTools MCP

End-to-end test suite using Chrome DevTools MCP for improved test reliability and accessibility-first selectors.

## Quick Start

### Running Tests

Ask Claude Code to execute tests:

```
Claude, run the smoke tests
Claude, run the login tests
Claude, test the shop connection flow
```

### Environment Setup

```bash
cd /workspaces/ProductSynch/apps/web/e2e-mcp
npm install
npm run health-check  # Verify environment
```

## Project Structure

```
e2e-mcp/
├── adapters/           # MCP abstraction layer
│   ├── types.ts       # TypeScript interfaces
│   ├── browser.adapter.ts
│   ├── snapshot.adapter.ts
│   ├── element.adapter.ts
│   └── assertion.adapter.ts
├── page-objects/      # Page Object Model
│   ├── base.page.mcp.ts
│   ├── auth/          # Authentication pages
│   ├── shops/         # Shop management pages
│   └── components/    # Shared components
├── tests/             # Test specifications
│   ├── smoke.spec.ts
│   ├── auth/
│   └── shops/
├── fixtures/          # Test data and helpers
├── global/            # Setup and teardown
└── utils/             # Helper utilities
```

## Test Coverage

- **Smoke Tests** (15 tests) - Critical path validation
- **Authentication** (~50 tests) - Login, register, password reset
- **Shop Management** (~90 tests) - Connection, catalog, product selection
- **Total**: ~155 tests

## Architecture

### MCP Adapter Pattern

Tests use a hybrid adapter pattern that:
- Abstracts Chrome DevTools MCP behind familiar APIs
- Preserves Page Object Model architecture
- Enables accessibility-first element selection

### Element Selection

Uses a11y tree for resilient element finding:

```typescript
// Find element by role and text
const uid = await snapshotAdapter.findElement(snapshot, {
  role: "button",
  text: "Connect new store"
});
await elementAdapter.click({ uid });
```

### Smart Snapshot Caching

- Caches snapshots for 5 seconds
- Invalidates after clicks, navigation, form submissions
- Balances performance with accuracy

## Key Features

1. **Resilient Selectors**: A11y tree is more stable than CSS selectors
2. **Accessibility Aligned**: Uses proper ARIA roles and accessible names
3. **Flexible Matching**: Text fallbacks handle UI variations
4. **Better Errors**: Detailed error messages with snapshot context

## Configuration

### Environment Variables

Create `.env` file:

```bash
E2E_BASE_URL=http://localhost:3000
E2E_API_URL=http://localhost:4000
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=testpass123
```

### MCP Configuration

See [mcp.config.ts](mcp.config.ts) for Chrome DevTools MCP settings.

## Contributing

### Migrating Page Objects

1. Extend `BasePageMCP`
2. Remove Playwright locator properties
3. Add dynamic selector methods with text fallbacks
4. Replace `locator.click()` with `elementAdapter.click(selector)`
5. Replace `expect(locator)` with `expect(selector, elementAdapter)`

Example:

```typescript
export class ShopsPageMCP extends BasePageMCP {
  async clickAddShop(): Promise<void> {
    const selector = {
      role: "button",
      text: /connect.*store/i
    };
    await this.elementAdapter.click(selector);
  }
}
```

## Comparison with Playwright

| Feature | Playwright | Chrome DevTools MCP |
|---------|-----------|---------------------|
| Selectors | CSS/text | A11y tree |
| Assertions | Built-in expect() | Custom polling expect() |
| Element refs | Static locators | Dynamic from snapshots |
| Auth state | JSON file | localStorage via evaluateScript |
| UI changes | Brittle | Resilient |

## Support

- GitHub Issues: https://github.com/anthropics/claude-code/issues
- Documentation: See files in this directory
