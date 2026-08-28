import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";

describe("overlay primitives (accessibility)", () => {
    it("Dialog has no axe violations when open", async () => {
        const { baseElement } = render(
            <Dialog open>
                <DialogContent showCloseButton={false}>
                    <DialogTitle>Report Rating</DialogTitle>
                    <DialogDescription>
                        Tell us why this rating should be reviewed.
                    </DialogDescription>
                </DialogContent>
            </Dialog>,
        );
        const results = await axe(baseElement);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("Sheet has no axe violations when open", async () => {
        const { baseElement } = render(
            <Sheet open>
                <SheetContent showCloseButton={false} side="top">
                    <SheetTitle>Navigation</SheetTitle>
                    <SheetDescription>Site navigation links</SheetDescription>
                </SheetContent>
            </Sheet>,
        );
        const results = await axe(baseElement);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });
});
