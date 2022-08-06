import { useState } from "react";
import { useHistory } from "react-router-dom";

const storage: Map<string, Map<string, unknown>> = new Map();

export function useHistoryState<S>(init: S, key: string) {
    const history = useHistory();

    const loadedValue = storage.get(history.location.key ?? "")?.get(key);

    const [state, setState] = useState(loadedValue ?? init);

    const wrappedSetState = (val: S) => {
        // If there is no key we can not set state
        if (!history.location.key) {
            return setState(val);
        }
        const locationStorage = storage.get(history.location.key);
        if (!locationStorage) {
            storage.set(history.location.key, new Map([[key, val]]));
        } else {
            locationStorage.set(key, val);
        }
        return setState(val);
    };

    return [state, wrappedSetState] as [S, (val: S) => void];
}
