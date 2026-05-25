import {
    ButtonStyle,
    ComponentType,
    type APIActionRowComponent,
    type APIButtonComponentWithURL,
    type APIComponentInMessageActionRow,
    type APIEmbed,
} from "discord-api-types/v10";
import type { Rating } from "@backend/types/schema";

const SITE_URL = "https://polyratings.dev";
const FIELD_MAX = 1024;
const CONTENT_MAX = 200;

const COLORS = {
    INFO: 0x3498db,
    WARNING: 0xf39c12,
    DANGER: 0xe74c3c,
    ADMIN: 0x9b59b6,
} as const;

export type DiscordNotification = {
    /** Shown in push notifications and channel list previews */
    content: string;
    embed: APIEmbed;
    /** When set, adds Professor + Admin link buttons below the embed */
    professorId?: string;
};

function field(text: string): string {
    return text.length <= FIELD_MAX ? text : `${text.slice(0, FIELD_MAX - 1)}…`;
}

function contentLine(text: string): string {
    return text.length <= CONTENT_MAX ? text : `${text.slice(0, CONTENT_MAX - 1)}…`;
}

function formatPostDate(postDate: string): string {
    const date = new Date(postDate);
    return Number.isNaN(date.getTime()) ? postDate : date.toLocaleDateString("en-US");
}

function professorLabel(lastName: string, firstName: string, department: string): string {
    return `${lastName}, ${firstName} (${department})`;
}

function shortProfessorLabel(lastName: string, firstName: string): string {
    return `${lastName}, ${firstName}`;
}

function ratingSummary(course: string, rating: Pick<Rating, "overallRating" | "postDate">): string {
    return `${course} · ${rating.overallRating}/4 · ${formatPostDate(rating.postDate)}`;
}

function adminPageUrl(): string {
    return `${SITE_URL}/admin`;
}

function professorPageUrl(professorId: string): string {
    return `${SITE_URL}/professor/${professorId}`;
}

function buildEmbed(
    input: Pick<APIEmbed, "title" | "description" | "color" | "fields" | "url">,
): APIEmbed {
    return {
        ...input,
        author: { name: "Polyratings", url: SITE_URL },
        timestamp: new Date().toISOString(),
        footer: { text: "Polyratings" },
    };
}

export function linkButtonComponents(
    professorId?: string,
): APIActionRowComponent<APIComponentInMessageActionRow>[] {
    const buttons: APIButtonComponentWithURL[] = [
        {
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: "Admin panel",
            url: adminPageUrl(),
        },
    ];
    if (professorId) {
        buttons.unshift({
            type: ComponentType.Button,
            style: ButtonStyle.Link,
            label: "Professor page",
            url: professorPageUrl(professorId),
        });
    }
    return [{ type: ComponentType.ActionRow, components: buttons }];
}

export function pendingProfessorNotification(
    firstName: string,
    lastName: string,
    professorId: string,
    department: string,
    course: string,
    queueSize: number,
): DiscordNotification {
    const label = professorLabel(lastName, firstName, department);
    return {
        content: contentLine(
            `🎓 Pending professor: ${shortProfessorLabel(lastName, firstName)} · queue ${queueSize}`,
        ),
        embed: buildEmbed({
            title: "New Professor Pending Approval",
            description: `${label} submitted with an initial rating for ${field(course)}.`,
            color: COLORS.INFO,
            url: adminPageUrl(),
            fields: [{ name: "Pending ID", value: professorId, inline: false }],
        }),
    };
}

export function ratingReportNotification(
    professor: { id: string; firstName: string; lastName: string; department: string },
    course: string,
    rating: Rating,
    reporterReason: string,
    reporterId: string,
): DiscordNotification {
    return {
        content: contentLine(
            `⚠️ Report: ${shortProfessorLabel(professor.lastName, professor.firstName)} · ${course}`,
        ),
        professorId: professor.id,
        embed: buildEmbed({
            title: "Rating Report Received",
            description:
                `${field(ratingSummary(course, rating))}\n\n` +
                `**Reporter:** ${field(reporterId)}\n` +
                `**Reason:** ${field(reporterReason)}`,
            color: COLORS.WARNING,
            url: professorPageUrl(professor.id),
            fields: [
                { name: "Rating", value: field(rating.rating), inline: false },
                { name: "Rating ID", value: rating.id, inline: false },
            ],
        }),
    };
}

export function autoDeletedRatingNotification(
    professor: { id: string; firstName: string; lastName: string; department: string },
    course: string,
    rating: Rating,
    moderationReason: string,
    reporterReason: string,
    reporterId: string,
): DiscordNotification {
    const label = professorLabel(professor.lastName, professor.firstName, professor.department);
    return {
        content: contentLine(
            `🚫 Auto-deleted: ${shortProfessorLabel(professor.lastName, professor.firstName)} · ${course}`,
        ),
        professorId: professor.id,
        embed: buildEmbed({
            title: "Rating Auto-Deleted",
            description:
                `Removed from ${label} after a report failed moderation.\n\n` +
                `**Reporter:** ${field(reporterId)}\n` +
                `**Report reason:** ${field(reporterReason)}\n` +
                `**Moderation:** ${field(moderationReason)}`,
            color: COLORS.DANGER,
            url: professorPageUrl(professor.id),
            fields: [
                { name: "Rating", value: field(rating.rating), inline: false },
                { name: "Rating ID", value: rating.id, inline: false },
            ],
        }),
    };
}

const MAX_IDS_IN_AUDIT = 10;

export function bulkRatingDeletionNotification(
    adminUsername: string,
    removedCount: number,
    professor: { id: string; firstName: string; lastName: string; department: string },
    ratingIds: string[],
    reason: string,
): DiscordNotification {
    const label = professorLabel(professor.lastName, professor.firstName, professor.department);
    const firstIds = ratingIds.slice(0, MAX_IDS_IN_AUDIT).join(", ");
    const idsSummary =
        ratingIds.length <= MAX_IDS_IN_AUDIT
            ? ratingIds.join(", ")
            : `${firstIds} (and ${ratingIds.length - MAX_IDS_IN_AUDIT} more)`;

    return {
        content: contentLine(
            `🗑️ Bulk delete: ${removedCount} rating(s) · ${shortProfessorLabel(professor.lastName, professor.firstName)}`,
        ),
        professorId: professor.id,
        embed: buildEmbed({
            title: "Bulk Rating Deletion",
            description: `${adminUsername} removed ${removedCount} rating(s) from ${label}.`,
            color: COLORS.ADMIN,
            url: professorPageUrl(professor.id),
            fields: [
                { name: "Reason", value: field(reason), inline: false },
                { name: "Rating IDs", value: field(idsSummary), inline: false },
            ],
        }),
    };
}

export function adminRatingDeletionNotification(
    adminUsername: string,
    professor: { id: string; firstName: string; lastName: string; department: string },
    course: string,
    rating: Rating,
): DiscordNotification {
    const label = professorLabel(professor.lastName, professor.firstName, professor.department);
    return {
        content: contentLine(
            `🗑️ Rating removed · ${shortProfessorLabel(professor.lastName, professor.firstName)} · ${course}`,
        ),
        professorId: professor.id,
        embed: buildEmbed({
            title: "Rating Removed",
            description: `${adminUsername} removed a rating from ${label}.\n\n${field(ratingSummary(course, rating))}`,
            color: COLORS.ADMIN,
            url: professorPageUrl(professor.id),
            fields: [
                { name: "Rating", value: field(rating.rating), inline: false },
                { name: "Rating ID", value: rating.id, inline: false },
            ],
        }),
    };
}

export function findRatingCourse(
    reviews: Record<string, Rating[]>,
    ratingId: string,
): string | undefined {
    for (const [course, ratings] of Object.entries(reviews)) {
        if (ratings.some((rating) => rating.id === ratingId)) {
            return course;
        }
    }
    return undefined;
}

export function findRating(
    reviews: Record<string, Rating[]>,
    ratingId: string,
): Rating | undefined {
    return Object.values(reviews)
        .flat()
        .find((rating) => rating.id === ratingId);
}
