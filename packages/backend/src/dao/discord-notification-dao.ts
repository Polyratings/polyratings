interface WebhookBody {
    wait?: boolean; // wait for a response, or accept a 204
    content: string; // actual message to be sent
    username?: string; // overrides webhook's default username
}

type DiscordUsername = "Pending Professor Notification" | "Received A Report";

export class DiscordNotificationDAO {
    constructor(private webhookURL: string) {}

    public async sendWebhook(username: DiscordUsername, content: string) {
        const webhookBody: WebhookBody = {
            wait: true,
            content,
            username,
        };

        await fetch(`${this.webhookURL}?${webhookBody.wait ? "wait=true" : ""}`, {
            method: "POST",
            body: JSON.stringify(webhookBody),
        });
    }
}
