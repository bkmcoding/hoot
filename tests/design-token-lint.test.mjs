import test from "node:test";
import assert from "node:assert/strict";

import { lintDesignTokens } from "../tools/design-token-lint.mjs";

test("design-token linter accepts tokenized rgba usage", () => {
  const css = `
    :root {
      --tone-overlay: rgba(31, 25, 16, 0.5);
      --shadow-dialog: 0 24px 60px var(--tone-overlay);
    }

    dialog {
      box-shadow: var(--shadow-dialog);
    }
  `;

  const result = lintDesignTokens(css);

  assert.deepEqual(result.violations, []);
  assert.equal(result.tokenCount, 1);
});

test("design-token linter reports raw rgba outside the token layer", () => {
  const css = `
    :root {
      --tone-overlay: rgba(31, 25, 16, 0.5);
    }

    dialog {
      box-shadow: 0 24px 60px rgba(31, 25, 16, 0.5);
    }
  `;

  const result = lintDesignTokens(css);

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].rule, "raw-rgba");
  assert.equal(result.violations[0].line, 7);
});

test("design-token linter reports undefined token references", () => {
  const css = `
    :root {
      --tone-overlay: rgba(31, 25, 16, 0.5);
    }

    dialog {
      box-shadow: 0 24px 60px var(--tone-undefined);
    }
  `;

  const result = lintDesignTokens(css);

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0].rule, "undefined-token");
  assert.equal(result.violations[0].line, 7);
});
