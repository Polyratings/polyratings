import { cleanup, render, RenderResult, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { act } from "react-dom/test-utils";
import { setWindowSize } from "@/test-utils";
import { AutoComplete } from ".";

function Wrapper({ disableDropdown }: { disableDropdown: boolean }) {
    const [value, setValue] = useState("");

    return (
        <AutoComplete
            placeholder="MyPlaceHolderText"
            // Use += since we are not using useState in the test
            onResult={(val) => {
                submitValue = val;
            }}
            onChange={setValue}
            maxDropDownSize={3}
            value={value}
            disableDropdown={disableDropdown}
            filterFn={(val) => {
                const arr = ["a", "ab", "abb", "abbb", "abbbb"];
                return arr.filter((s) => s.startsWith(val));
            }}
        />
    );
}

let autoComplete: RenderResult;
let submitValue: string;
describe("<AutoComplete />", () => {
    beforeEach(() => {
        submitValue = "";
        autoComplete = render(<Wrapper disableDropdown={false} />);
    });

    it("Has placeholder given", () => {
        autoComplete.getByPlaceholderText("MyPlaceHolderText");
    });

    it("Properly updates currentValue", async () => {
        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        userEvent.type(input, "abb");

        await autoComplete.findByDisplayValue("abb");
    });

    it("Shows search results of length given", async () => {
        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        await userEvent.type(input, "ab", { delay: 20 });

        await autoComplete.findByText("ab");

        await autoComplete.findByText("abb");

        await autoComplete.findByText("abbb");

        const shouldNotFind = autoComplete.queryByText("abbbb");
        expect(shouldNotFind).not.toBeInTheDocument();
    });

    it("Properly submits a value", async () => {
        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        userEvent.type(input, "abb{enter}");

        await waitFor(() => expect(submitValue).toBe("abb"));
    });

    it("Submit value does not have to be a valid search", async () => {
        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        userEvent.type(input, "dddd{enter}");

        await waitFor(() => expect(submitValue).toBe("dddd"));
    });

    it("Can select a value in the drop down", async () => {
        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        await userEvent.type(input, "ab{arrowdown}{arrowdown}{arrowdown}{arrowup}{enter}", {
            delay: 20,
        });

        await waitFor(() => expect(submitValue).toBe("abb"));
    });

    it("Can select an option in the dropdown with a click", async () => {
        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        await userEvent.type(input, "ab", { delay: 20 });

        const option = autoComplete.getByText("abbb");
        // Needed to stop the unfocus from happening first
        userEvent.click(option, undefined, { skipHover: true });

        await waitFor(() => expect(submitValue).toBe("abbb"));
    });

    it("Should not show values on unFocus", async () => {
        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        await userEvent.type(input, "ab", { delay: 20 });

        const option = autoComplete.getByText("abbb");
        // Not including the skip hover actually just fires onBlur on the input
        userEvent.click(option);

        const shouldNotFind = autoComplete.queryByText("abbb");
        expect(shouldNotFind).not.toBeInTheDocument();
        expect(submitValue).toBe("");
    });

    it("Does not show on small screens", async () => {
        const currentWidth = window.innerWidth;
        const currenHeight = window.innerHeight;
        act(() => setWindowSize(500, 800));

        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        await userEvent.type(input, "ab", { delay: 20 });

        const shouldNotFind = autoComplete.queryByText("abb");
        expect(shouldNotFind).not.toBeInTheDocument();

        act(() => setWindowSize(currentWidth, currenHeight));
    });

    it("Does not show dropdown when disabled", async () => {
        // Want to override the default wrapper option
        cleanup();

        autoComplete = render(<Wrapper disableDropdown />);

        const input = autoComplete.getByPlaceholderText("MyPlaceHolderText");
        await userEvent.type(input, "ab", { delay: 20 });

        const shouldNotFind = autoComplete.queryByText("abb");
        expect(shouldNotFind).not.toBeInTheDocument();
    });
});
