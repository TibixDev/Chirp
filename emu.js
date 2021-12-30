//* Display
let canvas = document.getElementById("display");
let ctx = canvas.getContext("2d");
canvas.style.width = "1024px";
canvas.style.height = "512px";
canvas.width = 64;
canvas.height = 32;

//* Components
let ram = EmuDefault.ram;
let pc = EmuDefault.pc;
let stack = EmuDefault.stack;
let ir = EmuDefault.ir;
let delayTimer = EmuDefault.delayTimer;
let soundTimer = EmuDefault.soundTimer;
let regs = EmuDefault.regs;
let pixels = EmuDefault.pixels;
let keyboard = EmuDefault.keyboard;

//* External Variables 
let isDebugMode = false;
let romLink = "./roms/test.rom"

let shouldIncrementPC = true;
let isPaused = false;

//* Constants
// const keyboardKeys = [49, 50, 51, 52, 81, 87, 69, 62, 65, 83, 68, 70, 89, 88, 67, 86]
const keyboardKeys = [88, 49, 50, 51, 81, 87, 69, 65, 83, 68, 89, 67, 52, 62, 70, 86]

const quirks = {
    shift_VX_is_VY: false,
    jump_with_offset_legacy: false,
    store_increment_ir: false,
    draw_sprite_wrap: true
}

const FONT = [
    0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
    0x20, 0x60, 0x20, 0x20, 0x70, // 1
    0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
    0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
    0x90, 0x90, 0xF0, 0x10, 0x10, // 4
    0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
    0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
    0xF0, 0x10, 0x20, 0x40, 0x40, // 7
    0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
    0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
    0xF0, 0x90, 0xF0, 0x90, 0x90, // A
    0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
    0xF0, 0x80, 0x80, 0x80, 0xF0, // C
    0xE0, 0x90, 0x90, 0x90, 0xE0, // D
    0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
    0xF0, 0x80, 0xF0, 0x80, 0x80  // F
]


//* Helper Functionsa
function LogDebug(inp) {
    if (isDebugMode) {
        console.log(inp)
    }
}

function ToHex(num) {
    return num.toString(16).padStart(4, "0");
}

function ToBinary(num) {
    return num.toString(2).padStart(16, "0");
}

function ByteToBits(byte) {
    return [...Array(8)].map((x,idx)=>byte>>idx&1);
}

function GetRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function LogInstructions(len, offset = 0, index=pc) {
    let instructions = [];
    for (let i = 0; i < len; i++) {
        instructions.push(`0x${ToHex(ram[index + i + offset])}`);
    }
    return instructions;
}

//* FUNCTION DEFINITIONS
function MemSet(ram, address, buffer) {
    if (buffer.length > 4096 - address) {
        return LogDebug(`[Malloc] The buffer is too big (Expected max ${4096 - address} bytes, got ${buffer.length} bytes).`)
    }
    for(let i = 0; i < buffer.length; i++) {
        ram[address + i] = buffer[i];
    }
}

function StartROM(url) {
    return fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            buffer = new Uint8Array(buffer);
            console.log(`[readROM] Fetched ${buffer.byteLength} bytes from "${url}"`);
            MemSet(ram, 0x200, buffer);
            console.log(`[readROM] Stored ${buffer.byteLength} bytes in RAM (${ram.byteLength})`);
            StartEmu();
        })
}

function DrawPixels() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "lightblue";
    for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 32; y++) {
            //^ Rainbow Mode
            // ctx.fillStyle = "#" + Math.floor(Math.random()*16777215).toString(16);
            if (pixels[x][y] == 1) {
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
    previousPixels = pixels;
}

function StartEmu() {
    MemSet(ram, 0, FONT);
    timerLoop = setInterval(() => {
        if (!isPaused) {
            // Dec delay and sound timers
            if (delayTimer > 0) {
                delayTimer--;
            }
            if (soundTimer > 0) {
                soundTimer--;
            }
        }
    }, 13.3)
    emuLoop = setInterval(() => {
        if (!isPaused) {
            ProcessCycle();
        }
    }, 1);
}

function PauseEmu() {
    isPaused = !isPaused;
    if (isPaused) {
        document.getElementById("pauseBtn").textContent = "continue"
    } else {
        document.getElementById("pauseBtn").textContent = "pause"
    }
}

function ResetEmu() {
    console.log("Resetting emulator...")
    clearInterval(timerLoop);
    clearInterval(emuLoop);
    ram = EmuDefault.ram;
    pc = EmuDefault.pc;
    stack = EmuDefault.stack;
    ir = EmuDefault.ir;
    delayTimer = EmuDefault.delayTimer;
    soundTimer = EmuDefault.soundTimer;
    regs = EmuDefault.regs;
    pixels = EmuDefault.pixels;    
    if (isPaused) {
        PauseEmu();
    }
    StartROM(romLink)
}

function ProcessCycle() {
    const instruction = ram[pc] << 8 | ram[pc + 1];
    ProcessInstruction(instruction);
    if (shouldIncrementPC) {        
        pc += 2;
    }
    shouldIncrementPC = true;
}

function ProcessInstruction(instruction) {
    // LogDebug(`opcode: ${hex(instruction)} && mask: ${hex(instruction & 0xF000)} && shifted: ${hex((instruction & 0xF000) >> 12)}`);
    const opcode = (instruction & 0xF000) >> 12;
    const x = (instruction & 0x0F00) >> 8;
    const y = (instruction & 0x00F0) >> 4;
    const n = instruction & 0x000F;
    const nn = instruction & 0x00FF;
    const nnn = instruction & 0x0FFF;
    // LogDebug(`[processor] pc: ${pc} opcode: ${opcode}, x: ${x}, y: ${y}, n: ${n}, nn: ${nn}, nnn: ${nnn}`);

    switch (opcode) {
        // Clear Screen (00E0) && Call Return (00EE)
        case 0x0:
            if (nn === 0xE0) {
                LogDebug("[0x00E0] Clear Screen")
                pixels = Array(64).fill().map(()=>Array(32).fill(0))
                // ctx.fillStyle = "black";
                // ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (nn === 0xEE) {
                pc = stack.pop()
                LogDebug(`[0x00EE] Call Return ${pc}`)
                shouldIncrementPC = false;
            }
            break;

        // Jump (1NNN)
        case 0x1:
            LogDebug(`[0x1] Jumping to ${nnn} from ${pc}`)
            pc = nnn;
            shouldIncrementPC = false;
            break;

        // Call (2NNN)
        case 0x2:
            LogDebug(`[0x2] Call ${nnn} from ${pc}`)
            stack.push(pc+2)
            pc = nnn;
            shouldIncrementPC = false;
            break;

        // Skip Equal (3XNN)
        case 0x3:
            if (regs[x] === nn) {
                pc+=2;
            }
            break;

        // Skip Not Equal (4XNN)
        case 0x4:
            if (regs[x] !== nn) {
                pc+=2;
            }
            break;

        // Skip VXVY equal (5XY0)
        case 0x5:
            if (regs[x] === regs[y]) {
                pc+=2;
            }
            break;

        // Skip VXVY not equal (9XY0)
        case 0x9:
            if (regs[x] !== regs[y]) {
                pc+=2;
            }
            break;

        // Set register VX (6XNN)
        case 0x6:
            LogDebug(`[0x6] Set regs[${x}] to ${nn}`);
            regs[x] = nn;
            break;
        
        // Add to VX (7XNN)
        case 0x7:
            LogDebug(`[0x7] Added ${nn} to regs[${x}] (${regs[x]} -> ${regs[x] + nn})`);
            regs[x] += nn;
            // Overflow (regs[0xF] not affected here)
            if (regs[x] > 256) {
                regs[x] -= 256;
            }
            break;
        
        
        // Set
        case 0x8:
            LogDebug(`[0x8] Set`);
            switch (n) {
                // Set VX -> VY (8XY0)
                case 0:
                    LogDebug(`[0x8] > Case 8XY0 [VX = VY] ${regs[x]} -> ${regs[y]}`);
                    regs[x] = regs[y];
                    break;
                
                // Set VX to VX | VY
                case 1:
                    LogDebug(`[0x8] > Case 8XY1 [VX = VX | VY] ${regs[x]} | ${regs[y]} (${regs[x] | regs[y]})`);
                    regs[x] = regs[x] | regs[y];
                    break;

                // Set VX to VX & VY
                case 2:
                    LogDebug(`[0x8] > Case 8XY2 [VX = VX & VY] ${regs[x]} & ${regs[y]} (${regs[x] & regs[y]})`);
                    regs[x] = regs[x] & regs[y];
                    break;
                
                // Set VX to VX ^ VY
                case 3:
                    LogDebug(`[0x8] > Case 8XY3 [VX = VX ^ VY] ${regs[x]} ^ ${regs[y]} (${regs[x] ^ regs[y]})`);
                    regs[x] = regs[x] ^ regs[y];
                    break;

                // Set VX to VX + VY
                case 4:
                    LogDebug(`[0x8] > Case 8XY4 [VX = VX + VY] ${regs[x]} + ${regs[y]} (${regs[x] + regs[y]})`);
                    regs[x] = regs[x] + regs[y];
                    // Overflow
                    if (regs[x] > 255) {
                        LogDebug(`[0x8] >> Overflow ${regs[x]} -> ${regs[x] - 256}`);
                        regs[x] -= 256;
                        regs[0xF] = 1;
                    } else {
                        regs[0xF] = 0;
                    }
                    break;
                
                // Set VX to VX - VY
                case 5:
                    LogDebug(`[0x8] > Case 8XY5 [VX = VX - VY] ${regs[x]} - ${regs[y]} (${regs[x] - regs[y]})`);
                    regs[x] = regs[x] - regs[y];
                    // Underflow
                    // if (regs[x] > regs[y]) {
                    if (regs[x] >= 0) {
                        regs[0xF] = 1;
                    } else {
                        LogDebug(`[0x8] >> Underflow ${regs[x]} -> ${regs[x] + 256}`);
                        regs[x] += 256;
                        regs[0xF] = 0;
                    }
                    break;

                // Set VX to VY - VX
                case 7:
                    LogDebug(`[0x8] > Case 8XY5 [VX = VY - VX] ${regs[y]} - ${regs[x]} (${regs[y] - regs[x]})`);
                    regs[x] = regs[y] - regs[x];
                    // Underflow
                    //if (regs[y] > regs[x]) {
                    if (regs[y] >= 0) {
                        regs[0xF] = 1;
                    } else {
                        LogDebug(`[0x8] >> Underflow ${regs[x]} -> ${regs[x] + 256}`);
                        regs[x] += 256;
                        regs[0xF] = 0;
                    }
                    break;

                // Shift VX >> 1
                case 6: {
                    if (quirks.shift_VX_is_VY) {
                        regs[x] = regs[y];
                    }
                    LogDebug(`[0x8] > Case 8XY6 [VX = VX >> 1] ${regs[x]} >> 1 (${regs[x] >> 1})`);
                    regs[x] = regs[x] >> 1;
                    // Underflow
                    if (regs[x] < 0) {
                        LogDebug(`[0x8] >> Underflow ${regs[x]} -> ${regs[x] + 256}`);
                        regs[x] += 256;
                    }
                    let bits = ByteToBits(regs[x]);
                    regs[0xf] = bits[0];
                    break;
                }
                
                // Shift VX << 1
                case 0xE: {
                    if (quirks.shift_VX_is_VY) {
                        regs[x] = regs[y];
                    }
                    LogDebug(`[0x8] > Case 8XYE [VX = VX << 1] ${regs[x]} << 1 (${regs[x] << 1})`);
                    regs[x] = regs[x] << 1;
                    // Overflow
                    if (regs[x] > 256) {
                        LogDebug(`[0x8] >> Overflow ${regs[x]} -> ${regs[x] - 256}`);
                        regs[x] -= 256;
                    }
                    let bits = ByteToBits(regs[x]);
                    regs[0xf] = bits[7];
                    break;
                }
            }
            break;

        // Set IR (ANNN)
        case 0xA:
            LogDebug(`[0xA] Setting ir to nnn (${ir} -> ${nnn})`);
            // logDebug(`Setting IR to ${nnn}`);
            ir = nnn;
            break;

        // Jump with offset (BNNN)
        case 0xB:
            if (quirks.jump_with_offset_legacy) {
                LogDebug(`[0xB] LEGACY: Jumping to nnn + regs[0] (${pc} -> [${nnn} + ${regs[0]}] -> ${nnn + regs[0]})`);
                pc = nnn + regs[0];
                shouldIncrementPC = false;
            } else {
                // TODO: Test, this is very questionable.
                LogDebug(`[0xB] Jumping to x + nn + regs[x] (${pc} -> [${x} + ${nn} + ${regs[x]}] -> ${x + nn + regs[x]})`);
                pc = x + nn + regs[x];
                shouldIncrementPC = false;
            }
            break;
        
        // Random
        case 0xC:
            regs[x] = GetRandomInt(256) & nn;
            LogDebug(`[0xC] Supplying random int ${regs[x]}`);
            break;
        
        /// Draw (DXYN)
        case 0xD:
            LogDebug("[0xD] Drawing")
            let coordX = regs[x] & 63;
            let coordY = regs[y] & 31;
            regs[0xf] = 0;
            for (let i = 0; i < n; i++) {
                // LogDebug(`[0xD] > ir: ${ir}, ir+i: ${ir+i}. byte: ${ram[ir+i]}`)
                let sprite_row = ram[ir+i];
                let bits = ByteToBits(sprite_row).reverse();
                LogDebug("[0xD] > SpriteRow bytes: " + bits.join("").replaceAll(0, "⬛").replaceAll(1, "⬜"))
                for (let j = 0; j < 8; j++) {
                    let jx = coordX + j;
                    let jy = coordY + i;

                    if (quirks.draw_sprite_wrap) {
                        jx &= 63;
                        jy &= 31;
                    }

                    if ((jx > 63 || jy > 31) && !quirks.draw_sprite_wrap) {
                        break;
                    }
                    if (bits[j] === 1 && pixels[jx][jy] === 1) {
                        pixels[jx][jy] = 0;
                        regs[0xf] = 1;
                    } else if (bits[j] === 1 && pixels[jx][jy] !== 1) {
                        pixels[jx][jy] = 1;
                    }
                }
            }
            DrawPixels();
            break;
    
        /// Skip if key (EX9E && EXA1)
        case 0xE:
            LogDebug("[0xE] Skip if key")
            if (nn === 0x9E && keyboard[regs[x]] === 1) {
                LogDebug(`[0xEX9E] Incrementing PC (${pc} -> ${pc + 2}) because ${keyboardKeys[regs[x]]} was held.`);
                pc+=2;
            }
            else if (nn === 0xA1 && keyboard[regs[x]] === 0) {
                LogDebug(`[0xEXA1] Incrementing PC (${pc} -> ${pc + 2}) because ${keyboardKeys[regs[x]]} wasn't held.`);
                pc+=2;
            }
            break;

        // A ton of stuff.
        case 0xF:
            // console.log(`[0xF] Got F instruction with nn ${nn}`)
            switch (nn) {
                // Set delayTimer -> VX (FX07)
                case 7:
                    LogDebug(`[0xFX07] Setting regs[x] to delayTimer (${regs[x]} -> ${delayTimer})`);
                    regs[x] = delayTimer;
                    break;
                
                // Set VX -> delayTimer (FX15)
                case 0x15:
                    LogDebug(`[0xFX15] Setting delayTimer to regs[x] (${delayTimer} -> ${regs[x]})`);
                    delayTimer = regs[x];
                    break;

                // Set VX -> soundTimer (FX18)
                case 0x18:
                    LogDebug(`[0xFX18] Setting soundTimer to regs[x] (${soundTimer} -> ${regs[x]})`);
                    soundTimer = regs[x];
                    break;

                // Add to ir (FX1E)
                case 0x1E:
                    LogDebug(`[0xFX1E] Adding regs[x] to ir (${ir} -> ${ir + regs[x]})`);
                    ir += regs[x];
                    // Overflow
                    if (ir > 4095) {
                        ir -= 4096;
                        regs[0xf] = 1;
                    }
                    break;
                
                // Font Character (FX29) 
                case 0x29: 
                    LogDebug(`[0xFX29] Fetching font character ${regs[x]} at addr ${regs[x]*5}`);
                    ir = (regs[x]&15)*5;
                    break;
                
                // Binary-coded decimal conversion
                case 0x33:
                    let digits = parseInt(regs[x]).toString().split('').map(Number);
                    MemSet(ram, ir, digits)
                    LogDebug(`[0xFX33] Converted ${regs[x]} into decimal (${digits}) and placed into RAM at addr ${ir}`);
                    break;

                // Store regs in memory (FX55)
                case 0x55:
                    LogDebug(`[0xFX55] Storing regs in ram at addr ${ir} with x ${x}`);
                    for (let i = 0; i < x+1; i++) {
                        if (quirks.store_increment_ir) {
                            ir++;
                        }
                        const addr = quirks.store_increment_ir ? ir : ir + i;
                        MemSet(ram, addr, [regs[i]])
                    }
                    break;

                // Load regs from memory (FX65)
                case 0x65:
                    LogDebug(`[0xFX65] Loading ram regs into regs from addr ${ir} with x ${x}`);
                    for (let i = 0; i < x+1; i++) {
                        if (quirks.store_increment_ir) {
                            ir++;
                        }
                        const addr = quirks.store_increment_ir ? ir : ir + i;
                        regs[i] = ram[addr];
                    }
                    break;

                // Wait for key (FXA0)
                case 0xA:
                    LogDebug(`[0xFXA0] Waiting for key`);
                    let toggledKey = keyboard.findIndex(k => k === 1);
                    if (toggledKey == -1) {
                        shouldIncrementPC = false;
                    } else {
                        LogDebug(`[0xFXA0] Got key ${toggledKey}, continuing...`);
                        regs[x] = toggledKey;
                    }
                    break;
                
                default:
                    console.log("[0xF] Something got fucked " + nnn);
            }

    }
}

document.getElementById("rom").value = romLink;
function ChangeROMLink() {
    let text = document.getElementById("rom").value;
    romLink = text;
}

document.addEventListener('keydown', HandleKeyDown);
function HandleKeyDown(e) {
    if (!e.repeat) {
        if (keyboardKeys.includes(e.keyCode)) {
            LogDebug(`[KeyDown] Code: ${e.code} | KeyCode: ${e.keyCode}`)
            keyboard[keyboardKeys.indexOf(e.keyCode)] = 1;
            LogDebug(keyboard);
        }
    }
}

document.addEventListener('keyup', HandleKeyUp);
function HandleKeyUp(e) {
    if (keyboardKeys.includes(e.keyCode)) {
        LogDebug(`[KeyUp] Code: ${e.code} | KeyCode: ${e.keyCode}`)
        setTimeout(() => keyboard[keyboardKeys.indexOf(e.keyCode)] = 0, 20);
        LogDebug(keyboard);
    }
}


let timerLoop = null;
let emuLoop = null;
StartROM(romLink)