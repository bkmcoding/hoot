import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_CSS_PATH = path.resolve("frontend/style.css");

function lineOf(css, index) {
  return css.slice(0, index).split("\n").length;
}

export function lintDesignTokens(css) {
  const violations = [];
  const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const rootMatch = cssWithoutComments.match(/:root\s*\{[\s\S]*?\}/);
  const rootBlock = rootMatch ? rootMatch[0] : "";
  const rootStart = rootMatch ? rootMatch.index : -1;
  const rootEnd = rootMatch ? rootStart + rootBlock.length : -1;

  const definedTokens = new Map(
    [...rootBlock.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map((match) => [
      match[1],
      match[2].trim(),
    ]),
  );
  const colorTokenCount = [...definedTokens.values()].filter((value) =>
    /rgba?\(/.test(value),
  ).length;

  for (const match of cssWithoutComments.matchAll(/rgba\(/g)) {
    const inRootBlock = match.index >= rootStart && match.index < rootEnd;
    if (!inRootBlock) {
      violations.push({
        rule: "raw-rgba",
        line: lineOf(css, match.index),
        message: "Raw rgba() is only allowed inside the :root token layer.",
      });
    }
  }

  for (const match of cssWithoutComments.matchAll(/var\((--[\w-]+)(?:\s*,[^)]*)?\)/g)) {
    const token = match[1];
    if (token.startsWith("--zone")) continue;
    if (!definedTokens.has(token)) {
      violations.push({
        rule: "undefined-token",
        line: lineOf(css, match.index),
        message: `${token} is referenced but not defined as a color token.`,
      });
    }
  }

  return {
    violations,
    tokenCount: colorTokenCount,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const cssPath = process.argv[2] ?? DEFAULT_CSS_PATH;
  const css = fs.readFileSync(cssPath, "utf8");
  const { violations, tokenCount } = lintDesignTokens(css);

  if (violations.length) {
    console.error(`Design token lint failed with ${violations.length} violation(s):`);
    for (const violation of violations) {
      console.error(`  ${cssPath}:${violation.line}: ${violation.rule} - ${violation.message}`);
    }
    process.exitCode = 1;
  } else {
    console.log(`Design token lint passed (${tokenCount} color token(s)).`);
  }
}
