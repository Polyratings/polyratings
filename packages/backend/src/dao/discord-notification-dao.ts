import {
    linkButtonComponents,
    type DiscordNotification,
} from "@backend/utils/discordNotifications";

export type NotificationDAO = {
    notify(notification: DiscordNotification): Promise<void>;
};

export class DiscordNotificationDAO implements NotificationDAO {
    constructor(private webhookURL: string) {}

    public async notify(notification: DiscordNotification): Promise<void> {
        try {
            const components = linkButtonComponents(notification.professorId);

            const response = await fetch(`${this.webhookURL}?wait=true&with_components=true`, {
                method: "POST",
                body: JSON.stringify({
                    username: "Polyratings",
                    content: notification.content,
                    embeds: [notification.embed],
                    components,
                    // eslint-disable-next-line camelcase
                    allowed_mentions: { parse: [] },
                }),
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                // eslint-disable-next-line no-console
                console.error(`Discord webhook error (${response.status}): ${errorText}`);
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Discord notification failed", error);
        }
    }
}

export class NoOpNotificationDao implements NotificationDAO {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars, class-methods-use-this
    public async notify(_notification: DiscordNotification): Promise<void> {}
}
