import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components";
import { Badge } from "@/components/ui/badge";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn, getApiErrorMessage } from "@/utils";

/** Same default page size as react-data-table-component; prev/next only (no per-page selector). */
export const ADMIN_TABLE_PAGE_SIZE = 10;

export const sectionHeadingClassName = "text-2xl font-bold tracking-tight text-brand md:text-3xl";
export const sectionClassName = "border-t border-border pt-10 first:border-t-0 first:pt-0 md:pt-12";
export const tableSurfaceClassName =
    "overflow-hidden rounded-lg border border-border bg-card shadow-sm";
export const adminLinkClassName = cn(
    "font-semibold text-brand underline decoration-accent decoration-2 underline-offset-4",
    "transition-colors hover:text-brand/75 focus-visible:rounded-sm",
    "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring",
);
export const filterBarClassName = "mb-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end";

export function createAdminMutationErrorHandler(action: string) {
    return (error: unknown) => {
        toast.error(getApiErrorMessage(error, `Failed to ${action}.`));
    };
}

export function getAdminTablePage<T>(rows: T[], page: number) {
    const pageCount = Math.max(1, Math.ceil(rows.length / ADMIN_TABLE_PAGE_SIZE));
    const currentPage = Math.min(Math.max(0, page), pageCount - 1);
    const start = currentPage * ADMIN_TABLE_PAGE_SIZE;
    return {
        pageRows: rows.slice(start, start + ADMIN_TABLE_PAGE_SIZE),
        pageCount,
        currentPage,
        total: rows.length,
    };
}

export function formatProfessorName(lastName?: string, firstName?: string) {
    if (!lastName && !firstName) {
        return "Unknown professor";
    }
    return `${lastName ?? ""}, ${firstName ?? ""}`.replace(/^,\s*|,\s*$/g, "").trim();
}

export function AdminSection({
    title,
    count,
    countLabel,
    children,
}: {
    title: string;
    count?: number;
    countLabel?: string;
    children: ReactNode;
}) {
    return (
        <section className={sectionClassName}>
            <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h2 className={sectionHeadingClassName}>{title}</h2>
                {count !== undefined && (
                    <Badge variant="secondary" className="rounded-md font-medium tabular-nums">
                        {count}
                        {countLabel ? ` ${countLabel}` : ""}
                    </Badge>
                )}
            </div>
            {children}
        </section>
    );
}

export function AdminTablePagination({
    total,
    page,
    pageCount,
    onPrevious,
    onNext,
}: {
    total: number;
    page: number;
    pageCount: number;
    onPrevious: () => void;
    onNext: () => void;
}) {
    const start = total === 0 ? 0 : page * ADMIN_TABLE_PAGE_SIZE + 1;
    const end = Math.min(total, (page + 1) * ADMIN_TABLE_PAGE_SIZE);

    return (
        <div className="flex items-center justify-end gap-3 border-t border-border px-3 py-2.5 text-sm text-muted-foreground">
            <span>{total === 0 ? "0 of 0" : `${start}–${end} of ${total}`}</span>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 0 || total === 0}
                onClick={onPrevious}
            >
                Previous
            </Button>
            <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= pageCount - 1 || total === 0}
                onClick={onNext}
            >
                Next
            </Button>
        </div>
    );
}

export function AdminTableEmptyRow({
    colSpan,
    message = "There are no records to display",
}: {
    colSpan: number;
    message?: string;
}) {
    return (
        <TableRow className="hover:bg-transparent">
            <TableCell colSpan={colSpan} className="py-8 text-center text-muted-foreground">
                {message}
            </TableCell>
        </TableRow>
    );
}

export function emptyStateMessage({
    hasSourceData,
    hasFilters,
    emptyLabel,
    noMatchLabel,
}: {
    hasSourceData: boolean;
    hasFilters: boolean;
    emptyLabel: string;
    noMatchLabel: string;
}) {
    if (!hasSourceData) {
        return emptyLabel;
    }
    if (hasFilters) {
        return noMatchLabel;
    }
    return emptyLabel;
}

export function AdminSearchInput({
    id,
    label,
    value,
    onChange,
    placeholder,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <div className="flex min-w-[12rem] flex-1 flex-col gap-1 sm:max-w-xs">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
                {label}
            </label>
            <Input
                id={id}
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
            />
        </div>
    );
}

interface ConfirmActionProps {
    action: () => void | Promise<void>;
    variant: "default" | "destructive";
    buttonText: string;
    ariaLabel: string;
    title: string;
    description: string;
    confirmLabel?: string;
    icon?: ReactNode;
    disabled?: boolean;
}

export function ConfirmAction({
    action,
    variant,
    buttonText,
    ariaLabel,
    title,
    description,
    confirmLabel = "Confirm",
    icon,
    disabled = false,
}: ConfirmActionProps) {
    const [open, setOpen] = useState(false);

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <Button
                    type="button"
                    variant={variant}
                    size="sm"
                    aria-label={ariaLabel}
                    disabled={disabled}
                >
                    {icon}
                    {buttonText}
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent size="default">
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel size="sm">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        size="sm"
                        variant={variant}
                        onClick={() => {
                            void action();
                        }}
                    >
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
