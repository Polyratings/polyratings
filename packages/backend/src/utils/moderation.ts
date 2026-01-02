import { Moderation } from "openai/resources/index";

/**
 * Moderation threshold configuration
 * Thresholds define the minimum score at which a rating will be rejected.
 */
export const MODERATION_THRESHOLDS: Partial<Record<keyof Moderation.CategoryScores, number>> = {
    // High priority - Safety-critical
    "harassment/threatening": 0.02,
    "hate/threatening": 0.005,
    "self-harm/instructions": 0.304,
    "self-harm/intent": 0.578,
    "sexual/minors": 0.074,
    "violence/graphic": 0.139,
    illicit: 0.269,

    // Medium priority
    sexual: 0.232,
    violence: 0.824,

    // Lower priority - Subjective (higher thresholds to reduce false positives)
    harassment: 0.878,
    hate: 0.697,
    "self-harm": 0.465,
};

/**
 * Category confidence scores
 * Lower confidence = need stronger signals to reduce false positives
 */
export const CATEGORY_CONFIDENCE: Partial<Record<keyof Moderation.CategoryScores, number>> = {
    "hate/threatening": 0.3,
    "sexual/minors": 0.3,
    illicit: 0.3,
    "harassment/threatening": 0.62,
    "self-harm/instructions": 0.8,
    "self-harm/intent": 0.6,
    "violence/graphic": 0.58,
    sexual: 0.6,
    violence: 0.54,
    harassment: 1.0,
    hate: 0.6,
    "self-harm": 0.6,
};

/**
 * Weights for calculating composite severity score
 * Higher weight = more important category (safety-critical)
 */
export const CATEGORY_WEIGHTS: Partial<Record<keyof Moderation.CategoryScores, number>> = {
    // Critical - highest weight
    "self-harm/intent": 10,
    "self-harm/instructions": 10,
    "sexual/minors": 10,
    "harassment/threatening": 8,
    "hate/threatening": 8,
    "violence/graphic": 8,

    // High priority
    "self-harm": 6,
    illicit: 5,
    sexual: 4,

    // Medium priority
    violence: 3,
    harassment: 2,
    hate: 2,
};

/**
 * Parent-child category relationships for compound signal detection
 */
export const PARENT_CHILD_RELATIONSHIPS: Record<string, string> = {
    "harassment/threatening": "harassment",
    "hate/threatening": "hate",
    "violence/graphic": "violence",
    "self-harm/intent": "self-harm",
    "self-harm/instructions": "self-harm",
    "sexual/minors": "sexual",
};

/**
 * Composite severity threshold for weighted scoring
 *
 * The composite severity score is derived from:
 * - The model's per-category scores (normally in the range [0, 1])
 * - CATEGORY_WEIGHTS, which emphasize safety-critical categories (up to weight 10)
 * - Any additional compound bonus applied for multiple elevated signals
 *
 * As a result, typical composite scores for user text fall in a low
 * single- to low double-digit range, where:
 * - Very low-risk content (all scores near 0) yields a severity near 0
 * - Clearly unsafe content in a single critical category (e.g. "sexual/minors"
 *   or "self-harm/instructions") with a high model score will often exceed 8.0
 * - Multiple medium/high-priority categories with moderately high scores can
 *   also combine to exceed this value
 *
 * The value 8.0 was chosen empirically during manual review of moderation logs
 * and test prompts to balance:
 * - False negatives: obviously unsafe content should consistently be rejected
 * - False positives: borderline or ambiguous content should usually be allowed
 *
 * Content with a composite severity score >= this threshold will be rejected.
 * If you adjust this value:
 * - Lower values will make moderation stricter (more content blocked)
 * - Higher values will make moderation more permissive (less content blocked)
 * Any change should be accompanied by a review of representative examples to
 * ensure the desired balance of false positives vs false negatives.
 */
export const SEVERITY_THRESHOLD = 8.0;

/**
 * Calculate compound bonus for multiple related categories being elevated
 * This catches violations that don't exceed individual thresholds but are
 * concerning when multiple signals are present.
 */
export function calculateCompoundBonus(categoryScores: Moderation.CategoryScores): {
    bonus: number;
    reasons: string[];
} {
    let bonus = 0;
    const reasons: string[] = [];

    // Threatening compound: harassment/threatening + hate/threatening
    const harassmentThreatening = categoryScores["harassment/threatening"] ?? 0;
    const hateThreatening = categoryScores["hate/threatening"] ?? 0;
    const harassmentThreateningThreshold = MODERATION_THRESHOLDS["harassment/threatening"];
    const hateThreateningThreshold = MODERATION_THRESHOLDS["hate/threatening"];
    if (
        harassmentThreateningThreshold !== undefined &&
        hateThreateningThreshold !== undefined &&
        harassmentThreatening >= harassmentThreateningThreshold * 0.5 &&
        hateThreatening >= hateThreateningThreshold * 0.5
    ) {
        bonus += 3;
        reasons.push("Multiple threat signals detected");
    }

    // Stalking compound: harassment/threatening + illicit (tracking/following behavior)
    // Uses low relative thresholds (5% and 3.7%) because stalking behavior is concerning
    // even at low levels when both signals are present. These values were tuned to match
    // the original hardcoded behavior (0.001 and 0.01) while maintaining threshold-relative scaling.
    const illicit = categoryScores.illicit ?? 0;
    const illicitThreshold = MODERATION_THRESHOLDS.illicit;
    if (
        harassmentThreateningThreshold !== undefined &&
        illicitThreshold !== undefined &&
        harassmentThreatening >= harassmentThreateningThreshold * 0.05 &&
        illicit >= illicitThreshold * 0.037
    ) {
        bonus += 2;
        reasons.push("Stalking behavior detected (threatening + tracking)");
    }

    // Discriminatory harassment compound: hate + harassment
    // Requires harassment near threshold (85%) + any hate signal (10%+)
    // The asymmetry is intentional: harassment must be high, but even small hate signals
    // combined with high harassment indicate discriminatory content.
    // Note: The hate threshold (10% of 0.697 = 0.0697) is intentionally low to catch
    // any discriminatory language when combined with high harassment, as even subtle
    // discriminatory signals combined with harassment are concerning.
    const hate = categoryScores.hate ?? 0;
    const harassment = categoryScores.harassment ?? 0;
    const hateThreshold = MODERATION_THRESHOLDS.hate;
    const harassmentThreshold = MODERATION_THRESHOLDS.harassment;
    if (
        hateThreshold !== undefined &&
        harassmentThreshold !== undefined &&
        hate >= hateThreshold * 0.1 &&
        harassment >= harassmentThreshold * 0.85
    ) {
        bonus += 3;
        reasons.push("Discriminatory harassment detected (hate + harassment)");
    }

    // Violence compound: violence/graphic + violence
    const violenceGraphic = categoryScores["violence/graphic"] ?? 0;
    const violence = categoryScores.violence ?? 0;
    const violenceGraphicThreshold = MODERATION_THRESHOLDS["violence/graphic"];
    const violenceThreshold = MODERATION_THRESHOLDS.violence;
    if (
        violenceGraphicThreshold !== undefined &&
        violenceThreshold !== undefined &&
        violenceGraphic >= violenceGraphicThreshold * 0.36 &&
        violence >= violenceThreshold * 0.36
    ) {
        bonus += 2;
        reasons.push("Multiple violence signals detected");
    }

    // Self-harm compound: intent + instructions (very serious)
    const selfHarmIntent = categoryScores["self-harm/intent"] ?? 0;
    const selfHarmInstructions = categoryScores["self-harm/instructions"] ?? 0;
    const selfHarmIntentThreshold = MODERATION_THRESHOLDS["self-harm/intent"];
    const selfHarmInstructionsThreshold = MODERATION_THRESHOLDS["self-harm/instructions"];
    if (
        selfHarmIntentThreshold !== undefined &&
        selfHarmInstructionsThreshold !== undefined &&
        selfHarmIntent >= selfHarmIntentThreshold * 0.35 &&
        selfHarmInstructions >= selfHarmInstructionsThreshold * 0.33
    ) {
        bonus += 5;
        reasons.push("Multiple self-harm signals detected");
    }

    // Parent-child elevation: if child is elevated, check if parent is also elevated
    for (const [child, parent] of Object.entries(PARENT_CHILD_RELATIONSHIPS)) {
        const childScore = categoryScores[child as keyof Moderation.CategoryScores] ?? 0;
        const childThreshold = MODERATION_THRESHOLDS[child as keyof Moderation.CategoryScores];
        const parentScore = categoryScores[parent as keyof Moderation.CategoryScores] ?? 0;
        const parentThreshold = MODERATION_THRESHOLDS[parent as keyof Moderation.CategoryScores];

        if (childThreshold !== undefined && parentThreshold !== undefined) {
            if (childScore >= childThreshold * 0.5) {
                if (parentScore >= parentThreshold * 0.5) {
                    bonus += 1.5;
                    reasons.push(`${child} and parent ${parent} both elevated`);
                }
            }
        }
    }

    return { bonus, reasons };
}

export interface ModerationViolation {
    category: string;
    score: number;
    threshold: number;
    reason: string;
}

/**
 * Checks moderation thresholds using a hybrid approach:
 * 1. Fast path: Simple threshold checks for common categories
 * 2. Weighted scoring: For edge cases and compound violations
 *    - Requires stronger signals for low-confidence categories
 *    - Catches compound violations (multiple related categories)
 *    - Uses composite severity score for nuanced decisions
 *
 * @param categoryScores - The category scores from OpenAI moderation API
 * @returns The category that caused rejection, or null if all checks pass
 */
export function checkModerationThresholds(
    categoryScores: Moderation.CategoryScores,
): ModerationViolation | null {
    // Step 1: Check categories with simple thresholds (fast path)
    const fastPathCategories: Array<keyof Moderation.CategoryScores> = [
        "harassment",
        "violence",
        "self-harm/intent",
        "self-harm/instructions",
        "illicit",
        "sexual",
    ];

    for (const category of fastPathCategories) {
        const threshold = MODERATION_THRESHOLDS[category];
        const score = categoryScores[category];

        if (threshold !== undefined && score !== undefined && score >= threshold) {
            return {
                category,
                score,
                threshold,
                reason: `${category} threshold exceeded (score: ${(score * 100).toFixed(2)}% >= threshold: ${(threshold * 100).toFixed(2)}%)`,
            };
        }
    }

    // Step 2: For low-confidence categories and edge cases, use weighted scoring
    let totalSeverity = 0;
    let primaryCategory = "";
    let maxWeightedScore = 0;
    const elevatedCategories: Array<{ category: string; score: number; weighted: number }> = [];

    // Calculate weighted scores for each category
    for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
        const score = categoryScores[category as keyof Moderation.CategoryScores] ?? 0;
        const threshold = MODERATION_THRESHOLDS[category as keyof Moderation.CategoryScores];
        const confidence = CATEGORY_CONFIDENCE[category as keyof Moderation.CategoryScores] ?? 0.5;

        // If a category has a weight but no threshold, treat this as a configuration issue.
        // We skip it (preserving existing behavior) but emit a warning to surface the mismatch.
        if (threshold === undefined) {
            // eslint-disable-next-line no-console
            console.warn(
                "Moderation config: missing threshold for category in CATEGORY_WEIGHTS:",
                category,
            );
        } else if (score > 0) {
            // Normalize score relative to threshold
            const normalizedScore = Math.min(score / threshold, 2.0);

            // For low-confidence categories, require stronger signals
            // Low confidence (<0.5) needs 3x threshold, medium (0.5-0.7) needs 2x, high (>0.7) uses 1.5x
            let confidenceBasedMultiplier: number;
            if (confidence < 0.5) {
                confidenceBasedMultiplier = 3.0;
            } else if (confidence < 0.7) {
                confidenceBasedMultiplier = 2.0;
            } else {
                confidenceBasedMultiplier = 1.5;
            }

            if (normalizedScore >= confidenceBasedMultiplier) {
                const weightedScore = normalizedScore * weight;
                totalSeverity += weightedScore;

                elevatedCategories.push({
                    category,
                    score,
                    weighted: weightedScore,
                });

                if (weightedScore > maxWeightedScore) {
                    maxWeightedScore = weightedScore;
                    primaryCategory = category;
                }
            } else if (normalizedScore >= 1.0) {
                // At threshold but below confidence-based multiplier - count with reduced weight.
                // Note: This intentionally creates a step at `normalizedScore === confidenceBasedMultiplier`,
                // so that signals which clearly exceed the confidence-based multiplier contribute
                // disproportionately more than borderline signals that have only just passed the base threshold.
                // This stepped behavior is deliberate to emphasize especially confident category activations.
                const weightedScore = (normalizedScore / confidenceBasedMultiplier) * weight * 0.5;
                totalSeverity += weightedScore;
            }
        }
    }

    // Add compound bonus for multiple related signals
    const { bonus, reasons: compoundReasons } = calculateCompoundBonus(categoryScores);
    totalSeverity += bonus;

    // Check composite severity score
    if (totalSeverity >= SEVERITY_THRESHOLD) {
        // Determine primary category for violation reporting
        // Prefer category with highest weighted score, fallback to first elevated category,
        // or "composite" if only compound bonus triggered (no individual elevated categories)
        const finalPrimaryCategory =
            primaryCategory || elevatedCategories[0]?.category || "composite";
        const isCompositePrimary = finalPrimaryCategory === "composite";
        const primaryScore = isCompositePrimary
            ? totalSeverity
            : (categoryScores[finalPrimaryCategory as keyof Moderation.CategoryScores] ?? 0);
        const primaryThreshold = isCompositePrimary
            ? SEVERITY_THRESHOLD
            : (MODERATION_THRESHOLDS[finalPrimaryCategory as keyof Moderation.CategoryScores] ?? 0);

        const reasonParts = [
            `Composite severity: ${totalSeverity.toFixed(2)} (threshold: ${SEVERITY_THRESHOLD})`,
            `Primary category: ${finalPrimaryCategory}`,
        ];

        if (isCompositePrimary) {
            reasonParts.push(
                "Violation triggered by the combined effect of multiple category signals rather than a single dominant category",
            );
        }

        if (compoundReasons.length > 0) {
            reasonParts.push(`Compound signals: ${compoundReasons.join("; ")}`);
        }

        if (elevatedCategories.length > 1) {
            reasonParts.push(
                `Multiple categories elevated: ${elevatedCategories.map((c) => c.category).join(", ")}`,
            );
        }

        return {
            category: finalPrimaryCategory,
            score: primaryScore,
            threshold: primaryThreshold,
            reason: reasonParts.join(". "),
        };
    }

    // All checks passed
    return null;
}
