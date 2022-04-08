import { Internal, ReportReviewRequest } from "@polyratings/shared";

interface WebhookBody {
    wait?: boolean; // wait for a response, or accept a 204
    content: string; // actual message to be sent
    username?: string; // overrides webhook's default username
}

export class DiscordNotificationDAO {
    constructor(private webhookURL: string) {}

    async notifyPendingProfessor(professor: Internal.ProfessorDTO) {
        const webhookBody: WebhookBody = {
            wait: true,
            content:
                `Professor ${professor.firstName} ${professor.lastName} ` +
                `with id: ${professor.id} is waiting for approval!`,
            username: "Pending Professor Notification",
        };

        await this.sendWebhook(webhookBody);
    }

    async notifyReportedReview(report: ReportReviewRequest) {
        const webhookBody: WebhookBody = {
            wait: true,
            content:
                `Rating ID: ${report.ratingId}\nProfessor ID: ` +
                `${report.professorId}\nReason: ${report.reason}`,
            username: "Received A Report",
        };

        await this.sendWebhook(webhookBody);
    }

    private async sendWebhook(request: WebhookBody) {
        await fetch(`${this.webhookURL}?${request.wait ? "wait=true" : ""}`, {
            method: "POST",
            body: JSON.stringify(request),
        });
    }
}
