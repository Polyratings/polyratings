import { useHistory, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, ElementRef } from "react";
import { TeacherEntry } from "@polyratings-revamp/shared";
import { TeacherService } from "../services";
import { TeacherCard, TEACHER_CARD_HEIGHT, MinMaxSlider, SearchBar } from "../components";
import { List, WindowScroller } from 'fish-react-virtualized';
import { useService, useQuery, useTailwindBreakpoint } from "../hooks";
import {Location} from 'history'

interface SearchPageState {
    searchTerm:string
}

interface SearchPageProps {
    location:Location
}

export function Search({location}: SearchPageProps) {
    const previousState = location.state as SearchPageState | undefined
    const query = useQuery()
    
    const [teacherService] = useService(TeacherService)

    const [searchTerm, setSearchTerm] = useState(previousState?.searchTerm ?? query.get('term') ?? '')
    const [searchResults, setSearchResults] = useState<TeacherEntry[]>([])

    const [filteredTeachers, setFilteredTeachers] = useState<TeacherEntry[]>([])
    const ref = useRef<ElementRef<typeof Filters>>(null)

    const history = useHistory()
    // This saves the current state of the filters by replacing the current route
    // with one with the state object to recreate if it gets popped off the history stack
    const saveState = () => {
        const rootRelativePath = window.location.href.replace(window.location.origin, '')
        const currentState:SearchPageState & FilterState = {
            searchTerm,
            // the ref will have to be defined at this state
            ...ref.current!.getState()
        }
        history.replace(rootRelativePath, currentState)
    }

    let listWidth = useTailwindBreakpoint({
        sm:600,
        md:672,
        lg:600,
        '2xl':672
    },window.innerWidth - 20)

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
            <SearchBar initialValue={searchTerm} onChange={setSearchTerm} showOnlyInput={true}/>
            {!searchResults.length &&
                <h1 className="text-4xl mt-5 text-center text-cal-poly-green">No Results Found</h1>
            }
            {Boolean(searchResults.length) &&
                <div className="relative">
                    <Filters ref={ref} teachers={searchResults} onUpdate={setFilteredTeachers} className="absolute left-0 top-0 pl-12 hidden xl:block"/>
                    <div className="flex justify-center"> 
                        <WindowScroller>
                            {({ height, isScrolling, onChildScroll, scrollTop }) => (
                                <List
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
                                            <TeacherCard teacher={filteredTeachers[index]} beforeNavigation={saveState}/>
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

type SortingOptions = 'relevant' | 'alphabetical' | 'overallRating' | 'recognizesStudentDifficulties' | 'presentsMaterialClearly'

interface FilterProps {
    teachers:TeacherEntry[]
    onUpdate:(teachers:TeacherEntry[]) => void
    className?:string,
}

interface FilterHandle {
    getState: () => FilterState
}

interface FilterState {
    departmentFilters: [string, boolean][]
    avgRatingFilter: [number, number]
    studentDifficultyFilter: [number, number]
    materialClearFilter: [number, number]
    sortBy: SortingOptions
    numberOfEvaluationsFilter: [number, number]
    reverseFilter: boolean
}

const FilterRenderFunction:React.ForwardRefRenderFunction<FilterHandle, FilterProps> = ({teachers, onUpdate, className}, ref) => {
    // Set default for className
    className = className || ''

    const location = useLocation()
    const previousState = location.state as FilterState | undefined

    let [departmentFilters, setDepartmentFilters] = useState<[string, boolean][]>(previousState?.departmentFilters ?? [])
    let [avgRatingFilter, setAvgRatingFilter] = useState<[number, number]>(previousState?.avgRatingFilter ?? [0,4])
    let [studentDifficultyFilter, setStudentDifficultyFilter] = useState<[number, number]>(previousState?.studentDifficultyFilter ?? [0,4])
    let [materialClearFilter, setMaterialClearFilter] = useState<[number, number]>(previousState?.materialClearFilter ?? [0,4])
    let [numberOfEvaluationsFilter, setNumberOfEvaluationsFilter] = useState<[number, number]>(previousState?.numberOfEvaluationsFilter ?? [1,2])
    let [reverseFilter, setReverseFilter] = useState(previousState?.reverseFilter ?? false)
    let [sortBy, setSortBy] = useState<SortingOptions>(previousState?.sortBy ?? 'relevant')

    const getState:() => FilterState = () => ({
        departmentFilters,
        avgRatingFilter,
        studentDifficultyFilter,
        materialClearFilter,
        sortBy,
        numberOfEvaluationsFilter,
        reverseFilter
    })

    useImperativeHandle(ref, () => ({
        getState
    }))

    const getEvaluationDomain:(data:TeacherEntry[]) => [number,number] = (data:TeacherEntry[]) => [
        data.reduce((acc,curr) => curr.numEvals < acc ? curr.numEvals : acc, Infinity),
        data.reduce((acc,curr) => curr.numEvals > acc ? curr.numEvals : acc, -Infinity)
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
            
            (teacher) => teacher.overallRating >= avgRatingFilter[0] && 
                teacher.overallRating <= avgRatingFilter[1],

            (teacher) => teacher.studentDifficulties >= studentDifficultyFilter[0] && 
                teacher.studentDifficulties <= studentDifficultyFilter[1],

            (teacher) => teacher.materialClear >= materialClearFilter[0] &&
                teacher.materialClear <= materialClearFilter[1],

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
        overallRating:(a,b) => b.overallRating - a.overallRating,
        recognizesStudentDifficulties:(a,b) => b.studentDifficulties - a.studentDifficulties,
        presentsMaterialClearly: (a,b) => b.materialClear - a.materialClear,
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
    }, Object.values(getState()))


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
            { name:'Recognizes Student Difficulties:', filter:setStudentDifficultyFilter, value:studentDifficultyFilter },
            { name:'Presents Material Clearly:', filter:setMaterialClearFilter, value:materialClearFilter }
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

const Filters = forwardRef(FilterRenderFunction)