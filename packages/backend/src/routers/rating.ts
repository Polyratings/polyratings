import { t } from "@backend/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { PendingRating, ratingBaseParser, RatingReport, reportParser } from "@backend/types/schema";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { Env } from "@backend/env";
import { getRateLimiter } from "@backend/middleware/rate-limiter";
import { Moderation } from "openai/resources/index";

const addRatingParser = ratingBaseParser.extend({
    professor: z.uuid(),
    department: z.enum(DEPARTMENT_LIST),
    courseNum: z.number().min(100).max(599),
});

/**
 * Moderation threshold configuration
 *
 * Thresholds define the minimum score at which a rating will be rejected.
 * These thresholds were tuned based on 4000 controversial reviews using
 * statistical optimization (ROC curves, Youden's J, cost-sensitive analysis).
 *
 * IMPROVED ALGORITHM: Uses weighted multi-category scoring with confidence adjustment.
 * This approach:
 * 1. Reduces false positives by requiring multiple signals or very high single signals
 * 2. Catches compound violations (multiple related categories elevated)
 * 3. Uses confidence-adjusted thresholds for low-data categories
 * 4. Provides more nuanced decision-making than pure threshold checking
 *
 * Tuned based on 254 manual decisions across all categories.
 */
const MODERATION_THRESHOLDS: Partial<Record<keyof Moderation.CategoryScores, number>> = {
    // High priority - Safety-critical (tuned based on 254 decisions)
    "harassment/threatening": 0.02, // 29 passes, 2 fails - very low to catch threats
    "hate/threatening": 0.005, // 5 passes, 0 fails - very low to catch threats
    "self-harm/instructions": 0.304, // 8 passes, 1 fails - good separation
    "self-harm/intent": 0.578, // 3 passes, 13 fails - catches 75% of failures
    "sexual/minors": 0.074, // 9 passes, 0 fails - conservative, limited data
    "violence/graphic": 0.139, // 28 passes, 1 fails - catches graphic violence
    illicit: 0.269, // 4 passes, 0 fails - conservative, limited data

    // Medium priority
    sexual: 0.232, // 6 passes, 5 fails - catches explicit content
    violence: 0.824, // 21 passes, 6 fails - high to allow idiomatic language

    // Lower priority - Subjective (higher thresholds to reduce false positives)
    harassment: 0.878, // 64 passes, 20 fails - high to allow negative feedback
    hate: 0.697, // 16 passes, 3 fails - moderate
    "self-harm": 0.465, // 3 passes, 7 fails - moderate
};

/**
 * Category confidence scores based on training data size
 * Lower confidence = need stronger signals to reduce false positives
 */
const CATEGORY_CONFIDENCE: Partial<Record<keyof Moderation.CategoryScores, number>> = {
    "hate/threatening": 0.3, // Only 5 decisions
    "sexual/minors": 0.3, // Only 9 decisions
    illicit: 0.3, // Only 4 decisions
    "harassment/threatening": 0.62, // 31 decisions
    "self-harm/instructions": 0.8, // 9 decisions, good separation
    "self-harm/intent": 0.6, // 16 decisions
    "violence/graphic": 0.58, // 29 decisions
    sexual: 0.6, // 11 decisions
    violence: 0.54, // 27 decisions
    harassment: 1.0, // 84 decisions - high confidence
    hate: 0.6, // 19 decisions
    "self-harm": 0.6, // 10 decisions
};

/**
 * Weights for calculating composite severity score
 * Higher weight = more important category (safety-critical)
 */
const CATEGORY_WEIGHTS: Partial<Record<keyof Moderation.CategoryScores, number>> = {
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
const PARENT_CHILD_RELATIONSHIPS: Record<string, string> = {
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
function calculateCompoundBonus(categoryScores: Moderation.CategoryScores): {
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
        hate > hateThreshold * 0.1 && // Hate at least 10% of threshold
        harassment > harassmentThreshold * 0.9
    ) {
        // Harassment near threshold + hate present = discriminatory harassment
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
            // Child is at least 50% of threshold
            if (childScore >= childThreshold * 0.5) {
                // Parent is at least 50% of threshold
                if (parentScore >= parentThreshold * 0.5) {
                    bonus += 1.5;
                    reasons.push(`${child} and parent ${parent} both elevated`);
                }
            }
        }
    }

    return { bonus, reasons };
}

/**
 * IMPROVED: Hybrid approach combining threshold checking with weighted scoring
 *
 * Strategy:
 * 1. High-confidence categories: Use simple threshold (fast, reliable)
 * 2. Low-confidence categories & edge cases: Use weighted multi-category scoring
 *    - Requires stronger signals for low-confidence categories (3x threshold)
 *    - Catches compound violations (multiple related categories)
 *    - Uses composite severity score for nuanced decisions
 *
 * @param categoryScores - The category scores from OpenAI moderation API
 * @returns The category that caused rejection, or null if all checks pass
 */
function checkModerationThresholds(
    categoryScores: Moderation.CategoryScores,
): { category: string; score: number; threshold: number; reason: string } | null {
    // Step 1: Check high-confidence categories with simple thresholds (fast path)
    const highConfidenceCategories: Array<keyof Moderation.CategoryScores> = [
        "harassment",
        "violence",
        "self-harm/intent",
        "self-harm/instructions",
    ];

    for (const category of highConfidenceCategories) {
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

    // Step 1.5: Explicit threshold checks for illicit and sexual
    // These categories have clear thresholds and should be caught immediately when exceeded
    const illicitScore = categoryScores.illicit ?? 0;
    const illicitThreshold = MODERATION_THRESHOLDS.illicit;
    if (illicitThreshold !== undefined && illicitScore >= illicitThreshold) {
        return {
            category: "illicit",
            score: illicitScore,
            threshold: illicitThreshold,
            reason: `illicit threshold exceeded (score: ${(illicitScore * 100).toFixed(2)}% >= threshold: ${(illicitThreshold * 100).toFixed(2)}%)`,
        };
    }

    const sexualScore = categoryScores.sexual ?? 0;
    const sexualThreshold = MODERATION_THRESHOLDS.sexual;
    if (sexualThreshold !== undefined && sexualScore >= sexualThreshold) {
        return {
            category: "sexual",
            score: sexualScore,
            threshold: sexualThreshold,
            reason: `sexual threshold exceeded (score: ${(sexualScore * 100).toFixed(2)}% >= threshold: ${(sexualThreshold * 100).toFixed(2)}%)`,
        };
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
                // At threshold but below required multiplier - still count but less
                const weightedScore = (normalizedScore / requiredMultiplier) * weight * 0.5;
                totalSeverity += weightedScore;
            }
        }
    }

    // Add compound bonus for multiple related signals
    const { bonus, reasons: compoundReasons } = calculateCompoundBonus(categoryScores);
    totalSeverity += bonus;

    // Check for immediate rejections (very high single category)
    for (const [category, threshold] of Object.entries(MODERATION_THRESHOLDS)) {
        const score = categoryScores[category as keyof Moderation.CategoryScores] ?? 0;
        if (threshold !== undefined && score >= threshold) {
            const excessRatio = score / threshold;
            const confidence =
                CATEGORY_CONFIDENCE[category as keyof Moderation.CategoryScores] ?? 0.5;

            // Very high scores (5x threshold) always reject, regardless of confidence
            if (excessRatio >= 5.0) {
                return {
                    category,
                    score,
                    threshold,
                    reason: `Extremely high ${category} score (${excessRatio.toFixed(1)}x threshold)`,
                };
            }

            // High scores (3x threshold) reject if confidence is medium or high
            if (excessRatio >= 3.0 && confidence >= 0.5) {
                return {
                    category,
                    score,
                    threshold,
                    reason: `Very high ${category} score (${excessRatio.toFixed(1)}x threshold)`,
                };
            }
        }
    }

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

export async function addRating(input: z.infer<typeof addRatingParser>, ctx: { env: Env }) {
    // Input is a string subset of PendingRating
    const pendingRating: PendingRating = {
        id: crypto.randomUUID(),
        ...input,
        postDate: new Date().toString(),
        status: "Failed",
        error: null,
        analyzedScores: null,
        anonymousIdentifier: await ctx.env.anonymousIdDao.getIdentifier(),
    };

    // Abuse protection: Check if the same rating text has already been submitted for the same professor
    const professor = await ctx.env.kvDao.getProfessor(input.professor);

    const existingRating = Object.values(professor.reviews)
        .flat()
        .find((rating) => rating.rating.trim() === pendingRating.rating);

    if (existingRating) {
        throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
                "This review has already been submitted, please contact dev@polyratings.org for assistance",
        });
    }

    const analysis = await ctx.env.ratingAnalyzer.analyzeRating(pendingRating);

    if (analysis) {
        pendingRating.analyzedScores = analysis.category_scores;

        // Check all configured moderation thresholds
        const violation = checkModerationThresholds(analysis.category_scores);

        if (violation) {
            // Update rating in processing queue
            pendingRating.status = "Failed";
            await ctx.env.kvDao.addRatingLog(pendingRating);

            throw new TRPCError({
                code: "PRECONDITION_FAILED",
                message:
                    "Sorry, we couldn't accept this review as written. Please keep ratings constructive and respectful.",
            });
        }
    }

    // Update rating in processing queue
    pendingRating.status = "Successful";

    const updatedProfessor = await ctx.env.kvDao.addRating(pendingRating);

    await ctx.env.kvDao.addRatingLog(pendingRating);

    return updatedProfessor;
}

/**
 * Check moderation for rating text without actually creating a rating.
 * Useful for testing and previewing whether content would be accepted.
 */
async function checkModeration(ratingText: string, ctx: { env: Env }) {
    // Create a minimal PendingRating object just for analysis
    const testRating: PendingRating = {
        id: crypto.randomUUID(),
        rating: ratingText,
        postDate: new Date().toString(),
        status: "Failed",
        error: null,
        analyzedScores: null,
        anonymousIdentifier: await ctx.env.anonymousIdDao.getIdentifier(),
        // Required fields with dummy values for analysis
        grade: "A",
        gradeLevel: "Freshman",
        courseType: "Elective",
        overallRating: 2,
        presentsMaterialClearly: 2,
        recognizesStudentDifficulties: 2,
        professor: crypto.randomUUID(),
        department: "AEPS",
        courseNum: 100,
    };

    const analysis = await ctx.env.ratingAnalyzer.analyzeRating(testRating);

    if (!analysis) {
        return {
            passed: true,
            message: "Moderation analysis unavailable (API error)",
            categoryScores: null,
            violation: null,
        };
    }

    const violation = checkModerationThresholds(analysis.category_scores);

    if (violation) {
        return {
            passed: false,
            message: "Content would be rejected",
            categoryScores: analysis.category_scores,
            violation: {
                category: violation.category,
                score: violation.score,
                threshold: violation.threshold,
                reason: violation.reason,
            },
        };
    }

    return {
        passed: true,
        message: "Content would be accepted",
        categoryScores: analysis.category_scores,
        violation: null,
    };
}

export const ratingsRouter = t.router({
    add: t.procedure
        .use(getRateLimiter("addRating"))
        .input(addRatingParser)
        .mutation(async ({ ctx, input }) => addRating(input, ctx)),
    checkModeration: t.procedure
        .input(z.object({ rating: z.string().trim().min(1) }))
        .query(async ({ ctx, input }) => checkModeration(input.rating, ctx)),
    report: t.procedure
        .input(reportParser.extend({ ratingId: z.uuid(), professorId: z.uuid() }))
        .mutation(async ({ ctx, input }) => {
            const anonymousIdentifier = await ctx.env.anonymousIdDao.getIdentifier();
            const ratingReport: RatingReport = {
                ratingId: input.ratingId,
                professorId: input.professorId,
                reports: [
                    {
                        email: input.email,
                        reason: input.reason,
                        anonymousIdentifier,
                    },
                ],
            };

            await ctx.env.kvDao.putReport(ratingReport);

            // Get the rating in question
            const professor = await ctx.env.kvDao.getProfessor(ratingReport.professorId);
            const rating = Object.values(professor.reviews)
                .flat()
                .find((rating) => rating.id === ratingReport.ratingId);

            await ctx.env.notificationDAO.notify(
                "Received A Report",
                `Rating ID: ${ratingReport.ratingId}\n` +
                    `Submitter: ${ratingReport.reports[0].anonymousIdentifier}` +
                    `Professor ID: ${ratingReport.professorId}\n` +
                    `Reason: ${ratingReport.reports[0].reason}\n` +
                    `Rating: ${rating?.rating ?? "ERROR-RATING-NOT-FOUND"}`,
            );
        }),
});
