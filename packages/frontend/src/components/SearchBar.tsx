import { useEffect, useState } from "react";
import { useHistory } from "react-router-dom"


export function SearchBar({initialValue}:{initialValue?:string}) {
    const [searchValue, setSearchValue] = useState('');
    useEffect(() => {
        setSearchValue(initialValue ?? '')
    }, [initialValue])
    const history = useHistory()
    const onFormSubmit = (e:React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        history.push(`/search/${encodeURIComponent(searchValue)}`)

    }
    return (
        <form 
        className="flex flex-col md:flex-row justify-center items-center py-6" 
        onSubmit={onFormSubmit}
    >
        <div className="flex">
            <div className="bg-gray-400 w-16 flex justify-center rounded-l-lg">
                <svg  xmlns="http://www.w3.org/2000/svg" className="w-6 h-full" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
            <input 
                className="w-60 sm:w-80 rounded-r-lg h-8 pl-2" 
                type="text" 
                placeholder="Enter A Teachers Name" 
                value={searchValue} 
                onChange={e => setSearchValue(e.target.value)}
            />
        </div>
        <button 
            className="bg-cal-poly-green text-white rounded-md px-5 ml-5 h-8 mt-3 lg:mt-0"
            type="submit"
        >Submit</button>
    </form>
    )
}