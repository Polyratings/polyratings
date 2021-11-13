import { useHistory, useParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { TeacherEntry } from "@polyratings-revamp/shared";
import { TeacherService } from "../services";
import { TeacherCard, TEACHER_CARD_HEIGHT, MinMaxSlider, SearchBar } from "../components";
import { List, WindowScroller } from 'react-virtualized';
import { useService } from "../hooks";

type SortingOptions = 'relevant' | 'alphabetical' | 'overallRating' 
//| 'recognizesStudentDifficulties' | 'presentsMaterialClearly'

export function Search() {
    let { searchTerm } = useParams<{searchTerm:string}>();
    if(searchTerm == '__all') {
        searchTerm = ''
    }

    const virtualList = useRef<List>(null)
    
    let [searchResults, setSearchResults] = useState<TeacherEntry[]>([])
    let [filteredTeachers, setFilteredTeachers] = useState<TeacherEntry[]>([])

    const LIST_MAX_WIDTH = 672
    let [listWidth, setListWidth] = useState(LIST_MAX_WIDTH)

    let [teacherService] = useService(TeacherService)

    useEffect(() => {
        if(window.innerWidth > LIST_MAX_WIDTH) {
            return setListWidth(LIST_MAX_WIDTH)
        }
        // 20px on each side
        setListWidth(window.innerWidth - 40)
    }, [window.innerWidth])


    useEffect(() => {
        async function retrieveSearchData() {
            try {
                let result:TeacherEntry[] = []
                if(!searchTerm) {
                    result = await teacherService.getAllTeachers()
                } else {
                    result = await teacherService.searchForTeacher(searchTerm)
                }
                setSearchResults(result)
            } catch(e) {
                console.error(`Failed to search for teacher with term: ${searchTerm}`,e)
                const history = useHistory()
                history.push('/')
            }
        }
        retrieveSearchData()
    }, [searchTerm])


    return(
        <div>
            <SearchBar initialValue={searchTerm}/>
            {!searchResults.length &&
                <h1 className="text-4xl mt-5 text-center text-cal-poly-green">No Results Found</h1>
            }
            {searchResults.length &&
                <div className="relative">
                    <Filters teachers={searchResults} onUpdate={setFilteredTeachers} className="absolute left-0 top-0 pl-12 hidden xl:block"/>
                    <div className="flex justify-center"> 
                        <WindowScroller>
                            {({ height, isScrolling, onChildScroll, scrollTop }) => (
                                <List
                                    ref={virtualList}
                                    autoHeight
                                    height={height}
                                    isScrolling={isScrolling}
                                    onScroll={onChildScroll}
                                    rowCount={filteredTeachers.length}
                                    rowHeight={TEACHER_CARD_HEIGHT}
                                    scrollTop={scrollTop}
                                    width={listWidth}
                                    rowRenderer={({style, key, index}) => (
                                        <div key={key} className="my-4" style={style}>
                                            <TeacherCard teacher={filteredTeachers[index]} />
                                        </div>
                                    )}
                                /> 
                            )}
                        </WindowScroller>
                    </div>
                </div>
            }
        </div>
    )
}

interface FilterProps {
    teachers:TeacherEntry[]
    onUpdate:(teachers:TeacherEntry[]) => void
    className?:string,
}

function Filters({teachers, onUpdate, className}:FilterProps) {
    // Set default for className
    className = className || ''
    let [departmentFilters, setDepartmentFilters] = useState<[string, boolean][]>([])
    let [avgRatingFilter, setAvgRatingFilter] = useState<[number, number]>([0,4])
    // let [recognizesStudentDifficultyFilter, setRecognizesStudentDifficultyFilter] = useState<[number, number]>([0,4])
    // let [presentsMaterialClearlyFilter, setPresentsMaterialClearlyFilter] = useState<[number, number]>([0,4])
    let [numberOfEvaluationsFilter, setNumberOfEvaluationsFilter] = useState<[number, number]>([1,2])
    let [reverseFilter, setReverseFilter] = useState(false)
    const getEvaluationDomain:(data:TeacherEntry[]) => [number,number] = (data:TeacherEntry[]) => [
        data.reduce((acc,curr) => curr.numEvals < acc ? curr.numEvals : acc, Infinity),
        data.reduce((acc,curr) => curr.numEvals > acc ? curr.numEvals : acc, -Infinity)
    ]
    let [sortBy, setSortBy] = useState<SortingOptions>('relevant')
    const filteredTeachersDeps = [
        departmentFilters,
        avgRatingFilter,
        // recognizesStudentDifficultyFilter,
        // presentsMaterialClearlyFilter,
        sortBy,
        numberOfEvaluationsFilter,
        reverseFilter
    ]

    useEffect(() => {
        const departments = [...(new Set(teachers.map(t => t.department)))]
        const initialDepartmentList:[string,boolean][] = departments
            .filter(dep => !!dep)
            .sort()
            .map(dep => [dep, false])
        setDepartmentFilters(initialDepartmentList)

        const initialEvaluationRange = getEvaluationDomain(teachers)
        setNumberOfEvaluationsFilter(initialEvaluationRange)
    },[teachers])

    const teacherFilterFunctions:() => ((teacher:TeacherEntry) => boolean)[] = () => {
        const depFilters = departmentFilters.filter(([,state]) => state).map(([dep]) => dep)
        return [
            (teacher) => {
                return depFilters.length == 0 || depFilters.includes(teacher.department)
            },
            
            (teacher) => parseFloat(teacher.avgRating) >= avgRatingFilter[0] && 
                parseFloat(teacher.avgRating) <= avgRatingFilter[1],

            // (teacher) => teacher.recognizesStudentDifficulties >= recognizesStudentDifficultyFilter[0] && 
            //     teacher.recognizesStudentDifficulties <= recognizesStudentDifficultyFilter[1],

            // (teacher) => teacher.presentsMaterialClearly >= presentsMaterialClearlyFilter[0] &&
            //     teacher.presentsMaterialClearly <= presentsMaterialClearlyFilter[1],

            (teacher) => teacher.numEvals >= numberOfEvaluationsFilter[0] &&
                teacher.numEvals <= numberOfEvaluationsFilter[1]
        ]
    }

    const sortingMap:{[key in SortingOptions]:(a: TeacherEntry, b: TeacherEntry) => number} = {
        alphabetical:(a,b) => {
            const aName = `${a.lastName}, ${a.firstName}`
            const bName = `${b.lastName}, ${b.firstName}`
            if(aName < bName) {
                return -1; 
            }
            if(aName > bName) {
                return 1; 
            }
            return 0;

        },
        relevant: () => {throw 'not a sort'},
        overallRating:(a,b) => parseFloat(b.avgRating) - parseFloat(a.avgRating),
        // recognizesStudentDifficulties:(a,b) => b.recognizesStudentDifficulties - a.recognizesStudentDifficulties,
        // presentsMaterialClearly: (a,b) => b.presentsMaterialClearly - a.presentsMaterialClearly,
    }

    useEffect(() => {
        const filteredResult = teachers.filter(teacher => {
            for(let filterFn of teacherFilterFunctions()) {
                if(!filterFn(teacher)) {
                    return false
                }
            }
            return true
        })
        if(sortBy != 'relevant') {
            filteredResult.sort(sortingMap[sortBy])
        }
        if(reverseFilter) {
            filteredResult.reverse()
        }
        onUpdate(filteredResult)
    }, filteredTeachersDeps)


    return(
    <div className={className}>
        <h2 className="text-xl font-bold transform -translate-x-4 pb-1">Sort by:</h2>
        <div className="flex items-center">
            <select 
                className="block w-full mt-1 h-7 border-2 border-black rounded-md" 
                value={sortBy} 
                onChange={e => setSortBy(e.target.value as SortingOptions)}
            >
                <option value="relevant">Relevant</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="overallRating">Overall Rating</option>
                <option value="recognizesStudentDifficulties">Recognizes Student Difficulty</option>
                <option value="presentsMaterialClearly">Presents Material Clearly</option>
            </select>
            {/* Sorting Arrow */}
            <svg xmlns="http://www.w3.org/2000/svg" 
                className={`h-5 w-5 hover:text-cal-poly-green transform transition-all ${reverseFilter ? 'rotate-180' : ''}`} 
                fill="none" viewBox="0 0 24 24" 
                stroke="currentColor" 
                onClick={() => setReverseFilter(!reverseFilter)}
            >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7l4-4m0 0l4 4m-4-4v18"/>
            </svg>
        </div>


        <h2 className="text-xl font-bold transform -translate-x-4 py-1">Filters:</h2>
        {[
            { name:'Overall Rating:', filter:setAvgRatingFilter, value:avgRatingFilter},
            // { name:'Recognizes Student Difficulties:', filter:setRecognizesStudentDifficultyFilter, value:recognizesStudentDifficultyFilter },
            // { name:'Presents Material Clearly:', filter:setPresentsMaterialClearlyFilter, value:presentsMaterialClearlyFilter }
        ].map(({name, filter, value}) => 
            <div key={name}>
                <h3>{name}</h3>
                <div className="mt-1">
                    <MinMaxSlider value={value} onchange={filter} domain={[0,4]}/>
                </div>
            </div>
        )}
        <div>
            <h3>Number of Reviews:</h3>
            <div className="mt-1">
                <MinMaxSlider
                    value={numberOfEvaluationsFilter}
                    onchange={setNumberOfEvaluationsFilter} 
                    domain={getEvaluationDomain(teachers)}
                    resolution={1}
                />
            </div>
        </div> 
        <div>
            <h3>Department:</h3>
            <div className="grid grid-cols-2 gap-x-2">
                {departmentFilters.map(([dep, state], i) => 
                    <label key={i} className="mt-1 flex items-center">
                        <input 
                            type="checkbox" value={state ? 1 : 0}
                            className="h-5 w-5"
                            onChange={e => {
                                const updatedDepartmentFilters = [...departmentFilters]
                                updatedDepartmentFilters[i][1] = e.target.checked
                                setDepartmentFilters(updatedDepartmentFilters)
                            }}
                        />
                        <span className="ml-2 text-gray-700">{dep}</span>
                    </label>
                )}
            </div>
        </div>
    </div>
    )
}