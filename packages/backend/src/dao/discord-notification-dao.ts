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

export class NoOpNotificationDao implements NotificationDAO {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this, @typescript-eslint/no-empty-function
    public async notify(_username: NotificationEvent, _content: string): Promise<void> {}
}
