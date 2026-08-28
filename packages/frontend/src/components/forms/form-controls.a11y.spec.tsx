import { fireEvent, render, waitFor } from "@testing-library/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { axe } from "jest-axe";
import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { Checkbox } from "./Checkbox";
import { Combobox } from "./Combobox";
import { Select } from "./Select";
import { StarRatingInput } from "./StarRatingInput";
import { TextArea } from "./TextArea";
import { TextInput } from "./TextInput";

describe("form wrappers (accessibility)", () => {
    it("TextInput has no axe violations", async () => {
        const { container } = render(<TextInput name="username" label="Username" />);
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("TextArea has no axe violations", async () => {
        const { container } = render(<TextArea name="rating" label="Rating" />);
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("Checkbox has no axe violations", async () => {
        const { container } = render(<Checkbox name="sameDepartment" label="Same Department" />);
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("Select has no axe violations", async () => {
        const { container } = render(
            <Select
                name="department"
                label="Department"
                options={[
                    { label: "CSC", value: "CSC" },
                    { label: "CPE", value: "CPE" },
                ]}
            />,
        );
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("preserves the select change-event API for react-hook-form consumers", () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <Select
                name="department"
                label="Department"
                options={[
                    { label: "CSC", value: "CSC" },
                    { label: "CPE", value: "CPE" },
                ]}
                onChange={onChange}
            />,
        );

        fireEvent.click(getByRole("combobox", { name: "Department" }));
        fireEvent.click(getByRole("option", { name: "CPE" }));

        expect(onChange.mock.calls[0][0].target.value).toBe("CPE");
        expect(onChange.mock.calls[0][0].target.name).toBe("department");
    });

    it("shows an empty-string option label after selection", () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <Select
                name="knownCourse"
                label="Course"
                options={[
                    { label: "CSC 101", value: "CSC 101" },
                    { label: "Other", value: "" },
                ]}
                defaultValue="CSC 101"
                onChange={onChange}
            />,
        );

        fireEvent.click(getByRole("combobox", { name: "Course" }));
        fireEvent.click(getByRole("option", { name: "Other" }));

        expect(onChange.mock.calls[0][0].target.value).toBe("");
        expect(getByRole("combobox", { name: "Course" })).toHaveTextContent("Other");
    });

    it("shows an empty-string combobox option label after selection", () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <Combobox
                name="knownCourse"
                label="Course"
                options={[
                    { label: "CSC 101", value: "CSC 101" },
                    { label: "Other", value: "" },
                ]}
                onChange={onChange}
            />,
        );

        fireEvent.focus(getByRole("combobox", { name: "Course" }));
        fireEvent.click(getByRole("option", { name: "Other" }));

        expect(onChange.mock.calls[0][0].target.value).toBe("");
        expect(getByRole("combobox", { name: "Course" })).toHaveValue("Other");
    });

    it("does not prefill the first option when the select is untouched", async () => {
        const onSubmit = vi.fn();
        const schema = z.object({ overallRating: z.string() });

        function Harness() {
            const { register, handleSubmit } = useForm({
                resolver: zodResolver(schema),
                defaultValues: { overallRating: "" },
            });
            return (
                <form onSubmit={handleSubmit((data) => onSubmit(data))}>
                    <Select
                        label="Overall Rating"
                        options={[4, 3, 2, 1, 0].map((n) => ({
                            label: `${n}`,
                            value: `${n}`,
                        }))}
                        {...register("overallRating")}
                    />
                    <button type="submit">Submit</button>
                </form>
            );
        }

        const { getByRole } = render(<Harness />);
        expect(getByRole("combobox", { name: "Overall Rating" })).toHaveTextContent(
            "Please select",
        );
        fireEvent.submit(getByRole("button", { name: "Submit" }).closest("form")!);

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
        });
        expect(onSubmit.mock.calls[0][0]).toEqual({ overallRating: "" });
    });

    it("Combobox has no axe violations", async () => {
        const { container, getByRole } = render(
            <Combobox
                name="department"
                label="Department"
                options={[
                    { label: "CSC", value: "CSC" },
                    { label: "CPE", value: "CPE" },
                ]}
            />,
        );
        fireEvent.focus(getByRole("combobox", { name: "Department" }));
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("preserves the combobox change-event API for react-hook-form consumers", () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <Combobox
                name="department"
                label="Department"
                options={[
                    { label: "CSC", value: "CSC" },
                    { label: "CPE", value: "CPE" },
                ]}
                onChange={onChange}
            />,
        );

        fireEvent.focus(getByRole("combobox", { name: "Department" }));
        fireEvent.click(getByRole("option", { name: "CPE" }));

        expect(onChange.mock.calls[0][0].target.value).toBe("CPE");
        expect(onChange.mock.calls[0][0].target.name).toBe("department");
    });

    it("filters combobox options as the user types", () => {
        const { getByRole, queryByRole } = render(
            <Combobox
                name="department"
                label="Department"
                options={[
                    { label: "CSC", value: "CSC" },
                    { label: "CPE", value: "CPE" },
                    { label: "MATH", value: "MATH" },
                ]}
            />,
        );

        const input = getByRole("combobox", { name: "Department" });
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "CP" } });

        expect(getByRole("option", { name: "CPE" })).toBeTruthy();
        expect(queryByRole("option", { name: "MATH" })).toBeNull();
    });

    it("offers the no-results option instead of an empty message", () => {
        const onChange = vi.fn();
        const { getByRole, queryByText } = render(
            <Combobox
                name="knownCourse"
                label="Course"
                options={[{ label: "CSC 101", value: "CSC 101" }]}
                noResultsOption={{ label: "Other", value: "__other__" }}
                onChange={onChange}
            />,
        );

        const input = getByRole("combobox", { name: "Course" });
        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "MATH 500" } });

        expect(queryByText("No results found.")).toBeTruthy();
        fireEvent.click(getByRole("option", { name: "Other" }));

        expect(onChange.mock.calls[0][0].target.value).toBe("__other__");
        expect(getByRole("combobox", { name: "Course" })).toHaveValue("Other");
    });

    it("does not offer Other until the course search has no matches", () => {
        const { getByRole, queryByRole } = render(
            <Combobox
                name="knownCourse"
                label="Course"
                options={[{ label: "CSC 101", value: "CSC 101" }]}
                noResultsOption={{ label: "Other", value: "__other__" }}
            />,
        );

        fireEvent.focus(getByRole("combobox", { name: "Course" }));

        expect(getByRole("option", { name: "CSC 101" })).toBeTruthy();
        expect(queryByRole("option", { name: "Other" })).toBeNull();
    });

    it("does not submit a value when the combobox is untouched", async () => {
        const onSubmit = vi.fn();
        const schema = z.object({ department: z.string() });

        function Harness() {
            const { register, handleSubmit } = useForm({
                resolver: zodResolver(schema),
                defaultValues: { department: "" },
            });
            return (
                <form onSubmit={handleSubmit((data) => onSubmit(data))}>
                    <Combobox
                        label="Department"
                        options={[
                            { label: "CSC", value: "CSC" },
                            { label: "CPE", value: "CPE" },
                        ]}
                        {...register("department")}
                    />
                    <button type="submit">Submit</button>
                </form>
            );
        }

        const { getByRole } = render(<Harness />);
        fireEvent.submit(getByRole("button", { name: "Submit" }).closest("form")!);

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
        });
        expect(onSubmit.mock.calls[0][0]).toEqual({ department: "" });
    });

    it("shows an updated value from the parent when closed", () => {
        const { getByRole, rerender } = render(
            <Combobox
                name="courseDepartment"
                label="Course Prefix"
                options={[
                    { label: "CSC", value: "CSC" },
                    { label: "CPE", value: "CPE" },
                ]}
                value=""
            />,
        );

        expect(getByRole("combobox", { name: "Course Prefix" })).toHaveValue("");

        rerender(
            <Combobox
                name="courseDepartment"
                label="Course Prefix"
                options={[
                    { label: "CSC", value: "CSC" },
                    { label: "CPE", value: "CPE" },
                ]}
                value="CSC"
            />,
        );

        expect(getByRole("combobox", { name: "Course Prefix" })).toHaveValue("CSC");
    });

    it("StarRatingInput has no axe violations", async () => {
        const { container } = render(
            <StarRatingInput name="overallRating" label="Overall Rating" />,
        );
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("StarRatingInput has no axe violations while showing an error", async () => {
        const { container } = render(
            <StarRatingInput name="overallRating" label="Overall Rating" error="Select a rating" />,
        );
        const results = await axe(container);
        expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    });

    it("offers a zero through four radio group that starts unselected", () => {
        const { getAllByRole, getByRole, getByText } = render(
            <StarRatingInput name="overallRating" label="Overall Rating" />,
        );

        const group = getByRole("radiogroup", { name: "Overall Rating" });
        expect(getAllByRole("radio")).toHaveLength(5);
        expect(group).toBeTruthy();
        expect(getByText("Please select")).toBeTruthy();
        getAllByRole("radio").forEach((radio) => {
            expect(radio).not.toBeChecked();
        });
    });

    it("preserves the star rating change-event API for react-hook-form consumers", () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = render(
            <StarRatingInput name="overallRating" label="Overall Rating" onChange={onChange} />,
        );

        fireEvent.click(getByRole("radio", { name: "4 out of 4" }));

        expect(onChange.mock.calls[0][0].target.value).toBe("4");
        expect(onChange.mock.calls[0][0].target.name).toBe("overallRating");
        expect(getByRole("radio", { name: "4 out of 4" })).toBeChecked();
        expect(getByText("4/4")).toBeTruthy();
    });

    it("lets the user pick a zero score", () => {
        const onChange = vi.fn();
        const { getByRole, getByText } = render(
            <StarRatingInput name="overallRating" label="Overall Rating" onChange={onChange} />,
        );

        fireEvent.click(getByRole("radio", { name: "0 out of 4" }));

        expect(onChange.mock.calls[0][0].target.value).toBe("0");
        expect(getByRole("radio", { name: "0 out of 4" })).toBeChecked();
        expect(getByText("0/4")).toBeTruthy();
    });

    it("blocks submission until a rating is picked and then submits the score", async () => {
        const onSubmit = vi.fn();
        const schema = z.object({ overallRating: z.string().min(1, "Select a rating") });

        function Harness() {
            const {
                register,
                handleSubmit,
                formState: { errors },
            } = useForm({
                resolver: zodResolver(schema),
                defaultValues: { overallRating: "" },
            });
            return (
                <form onSubmit={handleSubmit((data) => onSubmit(data))}>
                    <StarRatingInput
                        label="Overall Rating"
                        {...register("overallRating")}
                        error={errors.overallRating?.message}
                    />
                    <button type="submit">Submit</button>
                </form>
            );
        }

        const { getByRole } = render(<Harness />);
        fireEvent.submit(getByRole("button", { name: "Submit" }).closest("form")!);

        await waitFor(() => {
            expect(getByRole("alert")).toHaveTextContent("Select a rating");
        });
        expect(onSubmit).not.toHaveBeenCalled();

        fireEvent.click(getByRole("radio", { name: "0 out of 4" }));
        fireEvent.submit(getByRole("button", { name: "Submit" }).closest("form")!);

        await waitFor(() => {
            expect(onSubmit).toHaveBeenCalled();
        });
        expect(onSubmit.mock.calls[0][0]).toEqual({ overallRating: "0" });
    });

    it("preserves the checkbox change-event API for react-hook-form consumers", () => {
        const onChange = vi.fn();
        const { getByRole } = render(
            <Checkbox name="sameDepartment" label="Same Department" onChange={onChange} />,
        );

        fireEvent.click(getByRole("checkbox", { name: "Same Department" }));

        expect(onChange.mock.calls[0][0].target.checked).toBe(true);
        expect(onChange.mock.calls[0][0].target.value).toBe(true);
        expect(onChange.mock.calls[0][0].target.name).toBe("sameDepartment");
    });
});
