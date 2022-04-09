interface WebhookBody {
    content: string; // actual message to be sent
    username?: string; // overrides webhook's default username
}

type DiscordUsername = "Pending Professor Notification" | "Received A Report";

export class DiscordNotificationDAO {
    constructor(private webhookURL: string) {}

    public async sendWebhook(username: DiscordUsername, content: string) {
        const webhookBody: WebhookBody = {
            content,
            username,
        };

        // wait query-param will block for a response, or just accept a 204
        await fetch(`${this.webhookURL}?"wait=true"`, {
            method: "POST",
            body: JSON.stringify(webhookBody),
            headers: {
                "Content-Type": "application/json",
            },
        });
    }
}
