export const Log = {
    isDebug: false,
    debug: (...args) => {
        if (Log.isDebug) {
            console.log(...args);
        }
    },
}