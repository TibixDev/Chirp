// const EmuDefault = {
//     ram: () => new Uint8Array(4096),
//     pixels: () => Array(64).fill().map(()=>Array(32).fill(0)),
//     pc: () => 0x200,
//     stack: () => [],
//     ir: () => 0,
//     delay_timer: () => 0,
//     sound_timer: () => 0,
//     regs: () => Array(16).fill(0),
//     pixels: () => Array(64).fill().map(()=>Array(32).fill(0))
// }

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

let debug = false;
let rom = "./roms/test.rom"

let shouldIncrementPC = true;
let isPaused = false;

const options = {
    opcodes: {
        shift_VX_is_VY: false,
        jump_with_offset_legacy: false
    }
}

function logDebug(inp) {
    if (debug) {
        console.log(inp)
    }
}

const font = [
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
function hex(num) {
    return num.toString(16).padStart(4, "0");
}

function binary(num) {
    return num.toString(2).padStart(16, "0");
}

function byteToBits(byte) {
    return [...Array(8)].map((x,idx)=>byte>>idx&1);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
}

function logInstructions(len, offset = 0, index=pc) {
    let instructions = [];
    for (let i = 0; i < len; i++) {
        instructions.push(`0x${hex(ram[index + i + offset])}`);
    }
    return instructions;
}

//* FUNCTION DEFINITIONS
function drawPixels() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "lightblue";
    for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 32; y++) {
            //^ Rainbow Mode
            //ctx.fillStyle = "#" + Math.floor(Math.random()*16777215).toString(16);
            if (pixels[x][y] == 1) {
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
}

function startROM(url) {
    return fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            buffer = new Uint8Array(buffer);
            console.log(`[readROM] Fetched ${buffer.byteLength} bytes from "${url}"`);
            for (let i = 0x0; i < buffer.byteLength; i++) {
                ram[0x200 + i] = buffer[i];
            }
            console.log(`[readROM] Stored ${buffer.byteLength} bytes in RAM (${ram.byteLength})`);
            startEmu();
        })
}

function processCycle() {
    const instruction = ram[pc] << 8 | ram[pc + 1];
    processInstruction(instruction);
    if (shouldIncrementPC) {        
        pc += 2;
    }
    shouldIncrementPC = true;
}

function processInstruction(instruction) {
    // logDebug(`opcode: ${hex(instruction)} && mask: ${hex(instruction & 0xF000)} && shifted: ${hex((instruction & 0xF000) >> 12)}`);
    const opcode = (instruction & 0xF000) >> 12;
    const x = (instruction & 0x0F00) >> 8;
    const y = (instruction & 0x00F0) >> 4;
    const n = instruction & 0x000F;
    const nn = instruction & 0x00FF;
    const nnn = instruction & 0x0FFF;
    //logDebug(`[processor] pc: ${pc} opcode: ${opcode}, x: ${x}, y: ${y}, n: ${n}, nn: ${nn}, nnn: ${nnn}`);

    switch (opcode) {
        // Clear Screen (00E0) && Call Return (00EE)
        case 0x0:
            if (nn === 0xE0) {
                logDebug("[0x00E0] Clear Screen")
                pixels = Array(64).fill().map(()=>Array(32).fill(0))
                // ctx.fillStyle = "black";
                // ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else if (nn === 0xEE) {
                pc = stack.pop()
                logDebug(`[0x00EE] Call Return ${pc}`)
                shouldIncrementPC = false;
            }
            break;

        // Jump (1NNN)
        case 0x1:
            logDebug(`[0x1] Jumping to ${nnn} from ${pc}`)
            pc = nnn;
            shouldIncrementPC = false;
            break;

        // Call (2NNN)
        case 0x2:
            logDebug(`[0x2] Call ${nnn} from ${pc}`)
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
            logDebug(`[0x6] Set regs[${x}] to ${nn}`);
            regs[x] = nn;
            break;
        
        // Add to VX (7XNN)
        case 0x7:
            logDebug(`[0x7] Added ${nn} to regs[${x}] (${regs[x]} -> ${regs[x] + nn})`);
            regs[x] += nn;
            // Overflow (regs[0xF] not affected here)
            if (regs[x] > 256) {
                regs[x] -= 256;
            }
            break;
        
        
        // Set
        case 0x8:
            logDebug(`[0x8] Set`);
            switch (n) {
                // Set VX -> VY (8XY0)
                case 0:
                    logDebug(`[0x8] > Case 8XY0 [VX = VY] ${regs[x]} -> ${regs[y]}`);
                    regs[x] = regs[y];
                    break;
                
                // Set VX to VX | VY
                case 1:
                    logDebug(`[0x8] > Case 8XY1 [VX = VX | VY] ${regs[x]} | ${regs[y]} (${regs[x] | regs[y]})`);
                    regs[x] = regs[x] | regs[y];
                    break;

                // Set VX to VX & VY
                case 2:
                    logDebug(`[0x8] > Case 8XY2 [VX = VX & VY] ${regs[x]} & ${regs[y]} (${regs[x] & regs[y]})`);
                    regs[x] = regs[x] & regs[y];
                    break;
                
                // Set VX to VX ^ VY
                case 3:
                    logDebug(`[0x8] > Case 8XY3 [VX = VX ^ VY] ${regs[x]} ^ ${regs[y]} (${regs[x] ^ regs[y]})`);
                    regs[x] = regs[x] ^ regs[y];
                    break;

                // Set VX to VX + VY
                case 4:
                    logDebug(`[0x8] > Case 8XY4 [VX = VX + VY] ${regs[x]} + ${regs[y]} (${regs[x] + regs[y]})`);
                    regs[x] = regs[x] + regs[y];
                    // Overflow
                    if (regs[x] > 255) {
                        logDebug(`[0x8] >> Overflow ${regs[x]} -> ${regs[x] - 256}`);
                        regs[x] -= 256;
                        regs[0xF] = 1;
                    } else {
                        regs[0xF] = 0;
                    }
                    break;
                
                // Set VX to VX - VY
                case 5:
                    logDebug(`[0x8] > Case 8XY5 [VX = VX - VY] ${regs[x]} - ${regs[y]} (${regs[x] - regs[y]})`);
                    regs[x] = regs[x] - regs[y];
                    // Underflow
                    if (regs[x] > regs[y]) {
                        regs[0xF] = 1;
                    } else {
                        logDebug(`[0x8] >> Underflow ${regs[x]} -> ${regs[x] + 256}`);
                        regs[x] += 256;
                        regs[0xF] = 0;
                    }
                    break;

                // Set VX to VY - VX
                case 7:
                    logDebug(`[0x8] > Case 8XY5 [VX = VY - VX] ${regs[y]} - ${regs[x]} (${regs[y] - regs[x]})`);
                    regs[x] = regs[y] - regs[x];
                    // Underflow
                    if (regs[y] > regs[x]) {
                        regs[0xF] = 1;
                    } else {
                        logDebug(`[0x8] >> Underflow ${regs[x]} -> ${regs[x] + 256}`);
                        regs[x] += 256;
                        regs[0xF] = 0;
                    }
                    break;

                // Shift VX >> 1
                case 6: {
                    if (options.opcodes.shift_VX_is_VY) {
                        regs[x] = regs[y];
                    }
                    logDebug(`[0x8] > Case 8XY6 [VX = VX >> 1] ${regs[x]} >> 1 (${regs[x] >> 1})`);
                    regs[x] = regs[x] >> 1;
                    // Underflow
                    if (regs[x] < 0) {
                        logDebug(`[0x8] >> Underflow ${regs[x]} -> ${regs[x] + 256}`);
                        regs[x] += 256;
                    }
                    let bits = byteToBits(regs[x]);
                    regs[0xf] = bits[0];
                    break;
                }
                
                // Shift VX << 1
                case 0xE: {
                    if (options.opcodes.shift_VX_is_VY) {
                        regs[x] = regs[y];
                    }
                    logDebug(`[0x8] > Case 8XYE [VX = VX << 1] ${regs[x]} << 1 (${regs[x] << 1})`);
                    regs[x] = regs[x] << 1;
                    // Overflow
                    if (regs[x] > 256) {
                        logDebug(`[0x8] >> Overflow ${regs[x]} -> ${regs[x] - 256}`);
                        regs[x] -= 256;
                    }
                    let bits = byteToBits(regs[x]);
                    regs[0xf] = bits[7];
                    break;
                }
            }
            break;

        // Set IR (ANNN)
        case 0xA:
            logDebug(`[0xA] Setting ir to nnn (${ir} -> ${nnn})`);
            // logDebug(`Setting IR to ${nnn}`);
            ir = nnn;
            break;

        // Jump with offset (BNNN)
        case 0xB:
            if (options.jump_with_offset_legacy) {
                logDebug(`[0xB] LEGACY: Jumping to nnn + regs[0] (${pc} -> [${nnn} + ${regs[0]}] -> ${nnn + regs[0]})`);
                pc = nnn + regs[0];
                shouldIncrementPC = false;
            } else {
                // TODO: Test, this is very questionable.
                logDebug(`[0xB] Jumping to x + nn + regs[x] (${pc} -> [${x} + ${nn} + ${regs[x]}] -> ${x + nn + regs[x]})`);
                pc = x + nn + regs[x];
                shouldIncrementPC = false;
            }
            break;
        
        // Random
        case 0xC:
            regs[x] = getRandomInt(256) & nn;
            break;
        
        /// Draw (DXYN)
        case 0xD:
            logDebug("[0xD] Drawing")
            let coord_x = regs[x] & 63;
            let coord_y = regs[y] & 31;
            regs[0xf] = 0;
            for (let i = 0; i < n; i++) {
                // logDebug(`[0xD] > ir: ${ir}, ir+i: ${ir+i}. byte: ${ram[ir+i]}`)
                let sprite_row = ram[ir+i];
                let bits = byteToBits(sprite_row).reverse();
                logDebug("[0xD] > SpriteRow bytes: " + bits.join("").replaceAll(0, "⬛").replaceAll(1, "⬜"))
                for (let j = 0; j < 8; j++) {
                    if (coord_x+j > 64 || coord_y+i > 32) {
                        break;
                    }
                    if (bits[j] === 1 && pixels[coord_x+j][coord_y+i] === 1) {
                        pixels[coord_x+j][coord_y+i] = 0;
                        regs[0xf] = 1;
                    } else if (bits[j] === 1 && pixels[coord_x+j][coord_y+i] !== 1) {
                        pixels[coord_x+j][coord_y+i] = 1;
                    }
                }
            }
            drawPixels();
            break;
    }
}

function startEmu() {
    loop = setInterval(() => {
        if (!isPaused) {
            // Dec delay and sound timers
            if (delayTimer > 0) {
                delayTimer--;
            }
            if (soundTimer > 0) {
                soundTimer--;
            }
            processCycle();
        }
    }, 13.3)
}

function pauseEmu() {
    isPaused = !isPaused;
    if (isPaused) {
        document.getElementById("pauseBtn").textContent = "continue"
    } else {
        document.getElementById("pauseBtn").textContent = "pause"
    }
}

function resetEmu() {
    console.log("Resetting emulator...")
    clearInterval(loop);
    ram = EmuDefault.ram;
    pc = EmuDefault.pc;
    stack = EmuDefault.stack;
    ir = EmuDefault.ir;
    delayTimer = EmuDefault.delayTimer;
    soundTimer = EmuDefault.soundTimer;
    regs = EmuDefault.regs;
    pixels = EmuDefault.pixels;    
    if (isPaused) {
        pauseEmu();
    }
    startROM(rom)
}

document.getElementById("rom").value = rom;
function changeROMLink() {
    let text = document.getElementById("rom").value;
    rom = text;
}

let loop = null;
startROM(rom)