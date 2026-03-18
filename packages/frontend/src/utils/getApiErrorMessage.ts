export function getApiErrorMessage(error: unknown, fallbackMessage: string): string {
    if (error instanceof Error && error.message.trim()) {
        return error.message;
    }
    if (typeof error === "string" && error.trim()) {
        return error;
    }
    return fallbackMessage;
}
