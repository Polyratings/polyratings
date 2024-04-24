interface WebhookBody {
    content: string; // actual message to be sent
    username?: string; // overrides webhook's default username
}

type NotificationEvent = "Pending Professor Notification" | "Received A Report";

export type NotificationDAO = {
    notify(username: NotificationEvent, content: string): Promise<void>;
};

export class DiscordNotificationDAO implements NotificationDAO {
    constructor(private webhookURL: string) {}

    public async notify(username: NotificationEvent, content: string) {
        // Discord webhooks have a maximum allowed content size of 2000 characters.
        const truncatedContent = content.length <= 2000
            ? content
            : content.substring(0, 2000 - 11) + "[TRUNCATED]";

        const webhookBody: WebhookBody = {
            content: truncatedContent,
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

export class NoOpNotificationDao implements NotificationDAO {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
    public async notify(_username: NotificationEvent, _content: string): Promise<void> {}
}
