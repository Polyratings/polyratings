import { useState } from "react";
import { useLocation } from "react-router";

// TODO: Maybe introduce a mechanism to not have a memory leak!
const storage: Map<string, Map<string, unknown>> = new Map();

export function useLocationState<S>(init: S, key: string) {
    const location = useLocation();

    const loadedValue = storage.get(location.key ?? "")?.get(key);

    const [state, setState] = useState(loadedValue ?? init);

    const wrappedSetState = (val: S) => {
        // If there is no key we can not set state
        if (!location.key) {
            return setState(val);
        }
        const locationStorage = storage.get(location.key);
        if (!locationStorage) {
            storage.set(location.key, new Map([[key, val]]));
        } else {
            locationStorage.set(key, val);
        }
        return setState(val);
    };

    return [state, wrappedSetState] as [S, (val: S) => void];
}
