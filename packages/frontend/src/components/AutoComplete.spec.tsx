import { render, RenderResult, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { AutoComplete } from '.'

function Wrapper() {
    const [value, setValue] = useState('')
  
    return <AutoComplete 
        placeholder="MyPlaceHolderText" 
        // Use += since we are not using useState in the test
        onResult={(val) => {submitValue = val}}
        onChange={setValue}
        maxDropDownSize={3}
        value={value}
        disableDropdown={false}
        filterFn={(val) => {
            const arr = ['a', 'ab', 'abb', 'abbb', 'abbbb']
            return arr.filter(s => s.startsWith(val))
        }}
    />
  }

let autoComplete:RenderResult
let submitValue:string
describe('<AutoComplete />', () => {
    beforeEach(() => {
        submitValue = ''
        autoComplete = render(
            <Wrapper />
        )
    })

    it('Has placeholder given', () => {
       autoComplete.getByPlaceholderText('MyPlaceHolderText')
    })

    it('Properly updates currentValue', async () => {
        const input = autoComplete.getByPlaceholderText('MyPlaceHolderText')
        userEvent.type(input, 'abb')

        await autoComplete.findByDisplayValue('abb')
    })

    it('Shows search results of length given', async () => {
        const input = autoComplete.getByPlaceholderText('MyPlaceHolderText')
        await userEvent.type(input, 'ab', {delay:20})

        await new Promise(resolve => {setTimeout(resolve, 100)})

        await autoComplete.findByText('ab')

        await autoComplete.findByText('abb')

        await autoComplete.findByText('abbb')

        const shouldNotFind = autoComplete.queryByText('abbbb')
        expect(shouldNotFind).not.toBeInTheDocument()
    })

    it('Properly submits a value', async () => {
        const input = autoComplete.getByPlaceholderText('MyPlaceHolderText')
        userEvent.type(input, 'abb{enter}')

        await waitFor(() => expect(submitValue).toBe('abb'))
    })

    it('Submit value does not have to be a valid search', async () => {
        const input = autoComplete.getByPlaceholderText('MyPlaceHolderText')
        userEvent.type(input, 'dddd{enter}')

        await waitFor(() => expect(submitValue).toBe('dddd'))
    })

    it('Can select a value in the drop down', async () => {
        const input = autoComplete.getByPlaceholderText('MyPlaceHolderText')
        await userEvent.type(input, 'ab{arrowdown}{arrowdown}{enter}', {delay: 20})

        await waitFor(() => expect(submitValue).toBe('abb'))
    })

    test.todo('Does not show on small screens')

    test.todo('Does not show dropdown when disabled')
})
