import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type TestInfo } from "@playwright/test";
import type { AxeResults, Result } from "axe-core";

const DEFAULT_WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"] as const;

type AxeFixture = {
    /**
     * Returns an AxeBuilder pre-configured with the project-wide WCAG 2.1 AA
     * tag set. Chain `.include()` / `.exclude()` / `.disableRules()` /
     * `.withTags()` per test as needed.
     */
    makeAxeBuilder: () => AxeBuilder;
    /**
     * Runs a scan with `makeAxeBuilder()`, attaches the full results JSON to
     * the test report, and asserts `violations` is empty. Optional configure
     * callback for per-test customization.
     */
    scanForA11yViolations: (
        configure?: (builder: AxeBuilder) => AxeBuilder,
    ) => Promise<AxeResults>;
};

const attachResults = async (testInfo: TestInfo, name: string, results: AxeResults) => {
    await testInfo.attach(name, {
        body: JSON.stringify(results, null, 2),
        contentType: "application/json",
    });
};

const formatViolation = (violation: Result) => {
    const nodes = violation.nodes
        .slice(0, 3)
        .map(
            (node) =>
                `${node.target.join(" ")}: ${node.failureSummary ?? "No summary"}`,
        )
        .join("\n");

    return [
        `${violation.id} (${violation.impact ?? "unknown"})`,
        violation.help,
        nodes,
    ].join("\n");
};

export const test = base.extend<AxeFixture>({
    makeAxeBuilder: async ({ page }, use) => {
        const makeAxeBuilder = () => new AxeBuilder({ page }).withTags([...DEFAULT_WCAG_TAGS]);
        await use(makeAxeBuilder);
    },
    scanForA11yViolations: async ({ makeAxeBuilder }, use, testInfo) => {
        let scanCount = 0;
        const scan = async (configure?: (builder: AxeBuilder) => AxeBuilder) => {
            scanCount += 1;
            const builder = configure ? configure(makeAxeBuilder()) : makeAxeBuilder();
            const results = await builder.analyze();

            await attachResults(testInfo, `axe-results-${scanCount}.json`, results);

            expect(
                results.violations,
                results.violations.length
                    ? `Accessibility violations found:\n${results.violations
                          .map(formatViolation)
                          .join("\n\n")}`
                    : undefined,
            ).toEqual([]);

            return results;
        };

        await use(scan);
    },
});

export { expect } from "@playwright/test";
