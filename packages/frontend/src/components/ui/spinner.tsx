import * as React from "react";
import { Loader2Icon } from "lucide-react";

import { cn } from "@/utils";

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
    return (
        <output aria-label="Loading" className="inline-flex">
            <Loader2Icon
                data-slot="spinner"
                className={cn("size-4 animate-spin", className)}
                {...props}
            />
        </output>
    );
}

export { Spinner };
