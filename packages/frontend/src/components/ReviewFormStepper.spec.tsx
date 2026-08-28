import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { ReviewFormStepper } from "./ReviewFormStepper";

const schema = z.object({
    firstName: z.string().trim().min(1),
    ratingText: z.string().trim().min(20),
});

function Harness() {
    const form = useForm({
        resolver: zodResolver(schema),
        defaultValues: {
            firstName: "",
            ratingText: "",
        },
    });

    return (
        <FormProvider {...form}>
            <form>
                <ReviewFormStepper
                    isLoading={false}
                    aria-label="Add professor steps"
                    steps={[
                        {
                            id: "details",
                            label: "Professor Details",
                            fields: ["firstName"],
                            content: (
                                <input aria-label="First Name" {...form.register("firstName")} />
                            ),
                        },
                        {
                            id: "review",
                            label: "Write Review",
                            content: <p>Review step</p>,
                        },
                        {
                            id: "confirm",
                            label: "Confirm",
                            content: <p>Confirm step</p>,
                        },
                    ]}
                />
            </form>
        </FormProvider>
    );
}

describe("ReviewFormStepper", () => {
    it("stays on professor details when required fields are empty", async () => {
        render(<Harness />);

        fireEvent.click(screen.getByRole("button", { name: "Next" }));

        await waitFor(() => {
            expect(
                screen.getByText("Professor Details").closest("li")?.getAttribute("aria-current"),
            ).toBe("step");
        });
        expect(screen.getByText("Review step").parentElement?.classList.contains("hidden")).toBe(
            true,
        );
    });

    it("advances after required details fields are filled", async () => {
        render(<Harness />);

        fireEvent.change(screen.getByLabelText("First Name"), { target: { value: "Ada" } });
        fireEvent.click(screen.getByRole("button", { name: "Next" }));

        await waitFor(() => {
            expect(
                screen.getByText("Write Review").closest("li")?.getAttribute("aria-current"),
            ).toBe("step");
        });
        expect(screen.getByText("Review step").parentElement?.classList.contains("hidden")).toBe(
            false,
        );
    });
});
