import { Log } from './logger';

export class Keyboard {
    constructor(keyCount, keyCodes) {
        this.keys = new Uint8Array(keyCount);
        this.keyCodes = keyCodes;
    }

    HandleKeyDown(e) {
        if (!e.repeat) {
            if (this.keyCodes.includes(e.keyCode)) {
                Log.debug(`[KeyDown] Code: ${e.code} | KeyCode: ${e.keyCode}`)
                this.keys[this.keyCodes.indexOf(e.keyCode)] = 1;
                Log.debug(this.keys);
            }
        }
    }
    
    HandleKeyUp(e) {
        if (this.keyCodes.includes(e.keyCode)) {
            Log.debug(`[KeyUp] Code: ${e.code} | KeyCode: ${e.keyCode}`)
            setTimeout(() => this.keys[this.keyCodes.indexOf(e.keyCode)] = 0, 20);
            Log.debug(this.keys);
        }
    }
}