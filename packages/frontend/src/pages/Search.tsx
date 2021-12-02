import { useHistory, useLocation } from "react-router-dom";
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, ElementRef } from "react";
import { TeacherEntry } from "@polyratings/shared";
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
    const [mobileFiltersOpened, setMobileFiltersOpened] = useState(false)

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

    const listWidth = useTailwindBreakpoint({
        sm:600,
        md:672,
        lg:600,
        '2xl':672
    },window.innerWidth - 20)

    // If we remove the filters from the dom we can use one ref and simplify the process of restoring state
    const mobileFilterBreakpoint = useTailwindBreakpoint({xl:false}, true)

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
        <div className="">
            <SearchBar initialValue={searchTerm} onChange={setSearchTerm} showOnlyInput={true}/>
            {!searchResults.length || !filteredTeachers.length &&
                <h1 className="text-4xl mt-5 text-center text-cal-poly-green">No Results Found</h1>
            }
            {Boolean(searchResults.length) &&
                <div className="relative">
                    {!mobileFilterBreakpoint &&
                        <Filters ref={ref} teachers={searchResults} onUpdate={setFilteredTeachers} className="absolute left-0 top-0 pl-12 hidden xl:block"/>
                    }

                    {/* Mobile Filters dropdown */}
                    {mobileFilterBreakpoint &&
                        <div 
                            className={`bg-gray-300 w-[calc(100vw-2rem)] h-screen fixed top-0 z-10 transition-all left-0 transform ${mobileFiltersOpened ? '-translate-x-0' : '-translate-x-full'}`}
                        >
                            <div 
                                onClick={() => setMobileFiltersOpened(!mobileFiltersOpened)} 
                                className={`bg-gray-400 w-8 h-12 absolute -right-8 transition-all ${mobileFiltersOpened ? 'top-0 rounded-r-none' : 'top-14 rounded-r'} flex items-center justify-center`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-all ${mobileFiltersOpened ? 'rotate-180' : 'rotate-0'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                </svg>
                            </div>
                            
                                <Filters ref={ref} teachers={searchResults} onUpdate={setFilteredTeachers} className="pl-12 pt-6 w-4/5"/>
                            
                        </div>
                    }
                    <div className="flex justify-center"> 
                        <WindowScroller>
                            {({ height, isScrolling, onChildScroll, scrollTop }) => (
                                <List
                                    autoHeight
                                    height={height}
                                    isScrolling={isScrolling}
                                    onScroll={onChildScroll}
                                    rowCount={filteredTeachers.length < 8 ? 8 : filteredTeachers.length}
                                    rowHeight={TEACHER_CARD_HEIGHT}
                                    scrollTop={scrollTop}
                                    width={listWidth}
                                    rowRenderer={({style, key, index}) => (
                                        <div key={key} className="my-4" style={style}>
                                            {filteredTeachers[index] &&
                                            
                                                <TeacherCard teacher={filteredTeachers[index]} beforeNavigation={saveState}/>
                                            }
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
    departmentFilters: {name:string, state:boolean}[]
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
    // Component State
    let [departmentFilters, setDepartmentFilters] = useState<{name:string, state:boolean}[]>(previousState?.departmentFilters ?? [])
    let [avgRatingFilter, setAvgRatingFilter] = useState<[number, number]>(previousState?.avgRatingFilter ?? [0,4])
    let [studentDifficultyFilter, setStudentDifficultyFilter] = useState<[number, number]>(previousState?.studentDifficultyFilter ?? [0,4])
    let [materialClearFilter, setMaterialClearFilter] = useState<[number, number]>(previousState?.materialClearFilter ?? [0,4])
    let [numberOfEvaluationsFilter, setNumberOfEvaluationsFilter] = useState<[number, number]>(previousState?.numberOfEvaluationsFilter ?? [1,2])
    let [reverseFilter, setReverseFilter] = useState(previousState?.reverseFilter ?? false)
    let [sortBy, setSortBy] = useState<SortingOptions>(previousState?.sortBy ?? 'relevant')

    // Internal duplicate of result
    const [preDepartmentFilters, setPreDepartmentFilters] = useState<TeacherEntry[]>([])
    // On change duplicate result to the outside world
    useEffect(() => {
        const depFilters = departmentFilters.filter(({state}) => state).map(({name}) => name)
        const teachersToEmit = preDepartmentFilters.filter((teacher) => depFilters.length == 0 || depFilters.includes(teacher.department))
        onUpdate(teachersToEmit)
    }, [preDepartmentFilters, departmentFilters])
    

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

    const generateDepartmentFilters = (list:TeacherEntry[]) => {
        const departments = [...(new Set(list.map(t => t.department)))]
        const previousSelectedMap = departmentFilters.reduce((acc:{[name:string]:boolean}, {name, state}) => {
            acc[name] = state
            return acc
        },{})
        const initialDepartmentList = departments
            .filter(dep => !!dep)
            .sort()
            .map(dep => ({name:dep, state:!!previousSelectedMap[dep]}))
        setDepartmentFilters(initialDepartmentList)
    }
    

    useEffect(() => {
        generateDepartmentFilters(teachers)
        const initialEvaluationRange = getEvaluationDomain(teachers)
        setNumberOfEvaluationsFilter(initialEvaluationRange)
    },[teachers])

    const teacherFilterFunctions:((teacher:TeacherEntry) => boolean)[] = [      
        (teacher) => teacher.overallRating >= avgRatingFilter[0] && 
            teacher.overallRating <= avgRatingFilter[1],

        (teacher) => teacher.studentDifficulties >= studentDifficultyFilter[0] && 
            teacher.studentDifficulties <= studentDifficultyFilter[1],

        (teacher) => teacher.materialClear >= materialClearFilter[0] &&
            teacher.materialClear <= materialClearFilter[1],

        (teacher) => teacher.numEvals >= numberOfEvaluationsFilter[0] &&
            teacher.numEvals <= numberOfEvaluationsFilter[1]
    ]

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



    let filterCalculationDependencies = getState()
    delete (filterCalculationDependencies as any)['departmentFilters']
    useEffect(() => {
        const filteredResult = teachers.filter(teacher => {
            for(let filterFn of teacherFilterFunctions) {
                if(!filterFn(teacher)) {
                    return false
                }
            }
            return true
        })

        // relevant is no sort applied
        if(sortBy != 'relevant') {
            filteredResult.sort(sortingMap[sortBy])
        }

        if(reverseFilter) {
            filteredResult.reverse()
        }

        setPreDepartmentFilters(filteredResult)
        generateDepartmentFilters(filteredResult) 

    }, Object.values(filterCalculationDependencies))


    return(
    <div className={className}>
        <h2 className="text-xl font-bold transform -translate-x-4 pb-1">Sort by:</h2>
        <div className="flex items-center">
            <select 
                className="block w-[106%] mt-1 h-7 border-2 border-black rounded-md transform -translate-x-2"
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

        <div className="block xl:hidden mb-2">
            <h3>Department:</h3>
            <select 
                    className="w-[106%] mt-1 h-7 border-2 border-black rounded-md transform -translate-x-2"
                    onChange={(e) => {
                        const value = parseInt(e.target.value)
                        const newDepartmentFilters = [...departmentFilters].map(({name}) => ({name, state:false}))
                        if(value != -1) {
                            newDepartmentFilters[value].state = true
                        }
                        setDepartmentFilters(newDepartmentFilters)
                    }}
                >
                    <option value="-1">Any</option>
                    {departmentFilters.map((({name}, i) => <option value={i} key={name}>{name}</option>))}
            </select>
        </div>

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

        <div className="hidden xl:block">
            <h3>Department:</h3>
            <div className="grid grid-cols-2 gap-x-2">
                {departmentFilters.map(({name,state}, i) => 
                    <label key={name} className="mt-1 flex items-center">
                        <input 
                            type="checkbox"
                            checked={state}
                            className="h-5 w-5"
                            onChange={e => {
                                const updatedDepartmentFilters = [...departmentFilters]
                                updatedDepartmentFilters[i].state = e.target.checked
                                setDepartmentFilters(updatedDepartmentFilters)
                            }}
                        />
                        <span className="ml-2 text-gray-700">{name}</span>
                    </label>
                )}
            </div>

        </div>
    </div>
    )
}

const Filters = forwardRef(FilterRenderFunction)