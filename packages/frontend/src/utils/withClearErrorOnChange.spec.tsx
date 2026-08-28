import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import { withClearErrorOnChange } from "./withClearErrorOnChange";

const schema = z.object({
    name: z.string().trim().min(2, { error: "Enter a name" }),
});

function Harness() {
    const {
        register,
        clearErrors,
        handleSubmit,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(schema),
        reValidateMode: "onSubmit",
        defaultValues: { name: "" },
    });
    const registerField = withClearErrorOnChange(register, clearErrors);

    return (
        <form onSubmit={handleSubmit(() => undefined)}>
            <input aria-label="Name" {...registerField("name")} />
            {errors.name ? <p role="alert">{errors.name.message}</p> : null}
            <button type="submit">Submit</button>
        </form>
    );
}

describe("withClearErrorOnChange", () => {
    it("hides a field error as soon as the value changes", async () => {
        render(<Harness />);

        fireEvent.click(screen.getByRole("button", { name: "Submit" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Enter a name");

        fireEvent.change(screen.getByLabelText("Name"), { target: { value: "A" } });

        await waitFor(() => {
            expect(screen.queryByRole("alert")).toBeNull();
        });
    });
});
