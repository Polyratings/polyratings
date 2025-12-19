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
    if (harassmentThreatening > 0.01 && hateThreatening > 0.01) {
        bonus += 3;
        reasons.push("Multiple threat signals detected");
    }

    // Stalking compound: harassment/threatening + illicit (tracking/following behavior)
    const illicit = categoryScores.illicit ?? 0;
    if (harassmentThreatening > 0.001 && illicit > 0.01) {
        bonus += 2;
        reasons.push("Stalking behavior detected (threatening + tracking)");
    }

    // Discriminatory harassment compound: hate + harassment (both moderately elevated)
    const hate = categoryScores.hate ?? 0;
    const harassment = categoryScores.harassment ?? 0;
    const hateThreshold = MODERATION_THRESHOLDS.hate;
    const harassmentThreshold = MODERATION_THRESHOLDS.harassment;
    if (
        hateThreshold !== undefined &&
        harassmentThreshold !== undefined &&
        hate > hateThreshold * 0.1 &&
        harassment > harassmentThreshold * 0.85
    ) {
        bonus += 3;
        reasons.push("Discriminatory harassment detected (hate + harassment)");
    }

    // Violence compound: violence/graphic + violence
    const violenceGraphic = categoryScores["violence/graphic"] ?? 0;
    const violence = categoryScores.violence ?? 0;
    if (violenceGraphic > 0.05 && violence > 0.3) {
        bonus += 2;
        reasons.push("Multiple violence signals detected");
    }

    // Self-harm compound: intent + instructions (very serious)
    const selfHarmIntent = categoryScores["self-harm/intent"] ?? 0;
    const selfHarmInstructions = categoryScores["self-harm/instructions"] ?? 0;
    if (selfHarmIntent > 0.2 && selfHarmInstructions > 0.1) {
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
    let maxCategory = "";
    let maxWeightedScore = 0;
    const elevatedCategories: Array<{ category: string; score: number; weighted: number }> = [];

    // Calculate weighted scores for each category
    for (const [category, weight] of Object.entries(CATEGORY_WEIGHTS)) {
        const score = categoryScores[category as keyof Moderation.CategoryScores] ?? 0;
        const threshold = MODERATION_THRESHOLDS[category as keyof Moderation.CategoryScores];
        const confidence = CATEGORY_CONFIDENCE[category as keyof Moderation.CategoryScores] ?? 0.5;

        if (threshold !== undefined && score > 0) {
            // Normalize score relative to threshold
            const normalizedScore = Math.min(score / threshold, 2.0);

            // For low-confidence categories, require stronger signals
            // Low confidence (<0.5) needs 3x threshold, medium (0.5-0.7) needs 2x, high (>0.7) uses 1.5x
            let requiredMultiplier: number;
            if (confidence < 0.5) {
                requiredMultiplier = 3.0;
            } else if (confidence < 0.7) {
                requiredMultiplier = 2.0;
            } else {
                requiredMultiplier = 1.5;
            }

            if (normalizedScore >= requiredMultiplier) {
                const weightedScore = normalizedScore * weight;
                totalSeverity += weightedScore;

                elevatedCategories.push({
                    category,
                    score,
                    weighted: weightedScore,
                });

                if (weightedScore > maxWeightedScore) {
                    maxWeightedScore = weightedScore;
                    maxCategory = category;
                }
            } else if (normalizedScore >= 1.0) {
                // At threshold but below required multiplier - count with reduced weight
                const weightedScore = (normalizedScore / requiredMultiplier) * weight * 0.5;
                totalSeverity += weightedScore;
            }
        }
    }

    // Add compound bonus for multiple related signals
    const { bonus, reasons: compoundReasons } = calculateCompoundBonus(categoryScores);
    totalSeverity += bonus;

    // Check composite severity score
    const SEVERITY_THRESHOLD = 8.0;

    if (totalSeverity >= SEVERITY_THRESHOLD) {
        const primaryCategory = maxCategory || elevatedCategories[0]?.category || "composite";
        const primaryScore =
            categoryScores[primaryCategory as keyof Moderation.CategoryScores] ?? 0;
        const primaryThreshold =
            MODERATION_THRESHOLDS[primaryCategory as keyof Moderation.CategoryScores] ?? 0;

        const reasonParts = [
            `Composite severity: ${totalSeverity.toFixed(2)} (threshold: ${SEVERITY_THRESHOLD})`,
            `Primary category: ${primaryCategory}`,
        ];

        if (compoundReasons.length > 0) {
            reasonParts.push(`Compound signals: ${compoundReasons.join("; ")}`);
        }

        if (elevatedCategories.length > 1) {
            reasonParts.push(
                `Multiple categories elevated: ${elevatedCategories.map((c) => c.category).join(", ")}`,
            );
        }

        return {
            category: primaryCategory,
            score: primaryScore,
            threshold: primaryThreshold,
            reason: reasonParts.join(". "),
        };
    }

    // All checks passed
    return null;
}
