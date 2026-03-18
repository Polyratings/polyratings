import { getApiErrorMessage } from "@/utils";

interface InlineQueryStateProps {
    isPending?: boolean;
    error?: unknown;
    loadingMessage?: string;
    fallbackErrorMessage?: string;
    title?: string;
    wrapperClassName?: string;
    titleClassName?: string;
    loadingClassName?: string;
    errorClassName?: string;
}

export function InlineQueryState({
    isPending = false,
    error,
    loadingMessage,
    fallbackErrorMessage,
    title,
    wrapperClassName = "mt-4",
    titleClassName = "",
    loadingClassName = "text-cal-poly-green",
    errorClassName = "text-red-500",
}: InlineQueryStateProps) {
    if (!isPending && !error) return null;

    let content: React.ReactNode = null;
    if (error) {
        content = (
            <p className={errorClassName}>
                {getApiErrorMessage(
                    error,
                    fallbackErrorMessage ?? "Something went wrong. Please try again.",
                )}
            </p>
        );
    } else if (loadingMessage) {
        content = <p className={loadingClassName}>{loadingMessage}</p>;
    }

    return (
        <div className={wrapperClassName}>
            {title && <h2 className={titleClassName}>{title}</h2>}
            {content}
        </div>
    );
}
