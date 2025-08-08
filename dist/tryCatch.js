"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tryCatch = tryCatch;
// Implementation
function tryCatch(promiseOrFn) {
    if (promiseOrFn instanceof Promise) {
        return (async () => {
            try {
                const data = await promiseOrFn;
                return { data, error: null };
            }
            catch (error) {
                return { data: null, error: error };
            }
        })();
    }
    else if (typeof promiseOrFn === 'function') {
        try {
            const data = promiseOrFn();
            return { data, error: null };
        }
        catch (error) {
            return { data: null, error: error };
        }
    }
    else {
        throw new Error('Invalid argument passed to tryCatch. Expected a Promise or a function.');
    }
}
