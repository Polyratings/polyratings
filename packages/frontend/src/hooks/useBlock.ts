import { useEffect, useRef } from "react"
import { useHistory, useLocation } from "react-router"
import { Location, Action } from 'history';

type ShouldBlockFunction = (location:Location, action: Action) => Promise<any>

/*
 * Return truthy if you wish to block. Empty return or false will not block
 */
export function useBlock(func:ShouldBlockFunction) {
    const { block, push } = useHistory()
    const location = useLocation()

    const doBlock = () => {
        const unblock = block((location, action) => {
            const doBlock = async () => {
                await func(location, action) 
                unblock()
                push(location)    
            }
            doBlock()
            return false
        })
    }

    useEffect(doBlock, [location])
}