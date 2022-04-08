import { Internal } from "@polyratings/shared";

interface WebhookRequest {
    wait?: boolean; // wait for a response, or accept a 204
    content: string; // actual message to be sent
    username?: string; // overrides webhook's default username
}

export class DiscordNotificationDAO {
    constructor(private webhookURL: string) {}

    async notifyPendingProfessor(professor: Internal.ProfessorDTO) {
        const request: WebhookRequest = {
            wait: true,
            content:
                `Professor ${professor.firstName} ${professor.lastName} ` +
                `with id: ${professor.id} is waiting for approval!`,
            username: "Pending Professor Notification",
        };

        await this.sendWebhook(request);
    }

    async notifyReportedReview(report: Internal.RatingReport) {
        if (report.reports.length < 1) {
            throw Error("Reports must not be empty!");
        }

        const request: WebhookRequest = {
            wait: true,
            content:
                `Rating ID: ${report.ratingId}\nProfessor ID: ` +
                `${report.professorId}\nReason: ${report.reports[0].reason}`,
            username: "Received A Report",
        };

        await this.sendWebhook(request);
    }

    private async sendWebhook(request: WebhookRequest) {
        await fetch(
            new Request(`${this.webhookURL}?${request.wait ? "wait=true" : ""}`, {
                method: "POST",
                body: JSON.stringify(request),
            }),
        );
    }
}
