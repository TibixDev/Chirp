let ram = new Uint8Array(4096);
let canvas = document.getElementById("display");
let ctx = canvas.getContext("2d");
canvas.style.width = "1024px";
canvas.style.height = "512px";
canvas.width = 64;
canvas.height = 32;
let pc = 0x200;
let stack = [];
let ir = 0;
let delay_timer = 0;
let sound_timer = 0;
let regs = Array(16).fill(0);
let pixels = Array(64).fill().map(()=>Array(32).fill(0))

let debug = false;
let rom = "./roms/test.rom"

let shouldIncrementPC = true;

const options = {
    opcodes: {
        shift_VX_is_VY: true,
        jump_with_offset_legacy: true
    }
    // piss in progress
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


//* HELPERS
function hex(num) {
    return num.toString(16).padStart(4, "0");
}

function binary(num) {
    return num.toString(2).padStart(16, "0");
}

function byte_to_bits(byte) {
    return [...Array(8)].map((x,idx)=>byte>>idx&1);
}

function getRandomInt(max) {
    return Math.floor(Math.random() * max);
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
    //logDebug(`opcode: ${hex(instruction)} && mask: ${hex(instruction & 0xF000)} && shifted: ${hex((instruction & 0xF000) >> 12)}`);
    const opcode = (instruction & 0xF000) >> 12;
    const x = (instruction & 0x0F00) >> 8;
    const y = (instruction & 0x00F0) >> 4;
    const n = instruction & 0x000F;
    const nn = instruction & 0x00FF;
    const nnn = instruction & 0x0FFF;
    logDebug(`pc: ${pc} opcode: ${opcode}, x: ${x}, y: ${y}, n: ${n}, nn: ${nn}, nnn: ${nnn}`);

    switch (opcode) {
        // Clear Screen
        case 0x00E0:
            logDebug("[opcode] clear screen")
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;

        // Jump (1NNN)
        case 0x1:
            logDebug(`JMP to ${nnn}`)
            pc = nnn;
            shouldIncrementPC = false;
            break;

        // Call (2NNN)
        case 0x2:
            logDebug(`SJMP to ${nnn}`)
            stack.push(pc)
            pc = nnn;
            shouldIncrementPC = false;
            break;
        
        // Call Return (00EE)
        case 0x00EE:
            pc = stack.pop()
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
            logDebug(`Set regs[${x}] to ${nn}`);
            regs[x] = nn;
            break;
        
        // Add to VX (7XNN)
        case 0x7:
            logDebug(`Added ${nn} to regs[${x}] (${regs[x]} -> ${regs[x] + nn})`);
            regs[x] += nn;
            // TODO: Fix this
            break;
        
        
        // Set
        case 0x8:
            switch (n) {
                // Set VX -> VY (8XY0)
                case 0:
                    regs[x] = regs[y];
                    break;
                
                // Set VX to VX | VY
                case 1:
                    regs[x] = regs[x] | regs[y];
                    break;

                // Set VX to VX & VY
                case 2:
                    regs[x] = regs[x] & regs[y];
                    break;
                
                // Set VX to VX ^ VY
                case 3:
                    regs[x] = regs[x] ^ regs[y];
                    break;

                // Set VX to VX + VY
                case 4:
                    regs[x] = regs[x] + regs[y];
                    break;
                
                // Set VX to VX - VY
                case 5:
                    regs[x] = regs[x] - regs[y];
                    break;

                // Set VX to VY - VX
                case 7:
                    regs[x] = regs[y] - regs[x];
                    break;

                // Shift VX >> 1
                case 6: {
                    if (options.opcodes.shift_VX_is_VY) {
                        regs[x] = regs[y];
                    }
                    regs[x] = regs[x] >> 1;
                    let bits = byte_to_bits(regs[x]);
                    regs[0xf] = bits[0];
                    break;
                }
                
                // Shift VX << 1
                case 0xE: {
                    if (options.opcodes.shift_VX_is_VY) {
                        regs[x] = regs[y];
                    }
                    regs[x] = regs[x] << 1;
                    let bits = byte_to_bits(regs[x]);
                    regs[0xf] = bits[7];
                    break;
                }
            }

        // Set IR (ANNN)
        case 0xA:
            logDebug(`Setting IR to ${nnn}`);
            ir = nnn;
            break;

        // Jump with offset (BNNN)
        case 0xB:
            if (options.jump_with_offset_legacy) {
                pc = nnn + regs[0];
                shouldIncrementPC = false;
            } else {
                // TODO: Test, this is very questionable.
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
            logDebug("[opcode] draw")
            let coord_x = regs[x] & 63;
            let coord_y = regs[y] & 31;
            regs[0xf] = 0;
            for (let i = 0; i < n; i++) {
                logDebug(`[draw] ir: ${ir}, ir+i: ${ir+i}. byte: ${ram[ir+i]}`)
                let sprite_row = ram[ir+i];
                let bits = byte_to_bits(sprite_row).reverse();
                logDebug("SpriteRow bytes: " + bits)
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
            break;
    }
}

function startEmu() {
    loop = setInterval(() => {
        // Dec delay and sound timers
        if (delay_timer > 0) {
            delay_timer--;
        }
        if (sound_timer > 0) {
            sound_timer--;
        }
    
        processCycle();
        drawPixels();
    }, 13.3)
}

function resetEmu() {
    console.log("Resetting emulator...")
    clearInterval(loop);
    loop = null;
    ram = new Uint8Array(4096);
    pixels = Array(64).fill().map(()=>Array(32).fill(0))
    pc = 0x200;
    stack = [];
    ir = 0;
    delay_timer = 0;
    sound_timer = 0;
    regs = Array(16).fill(0);
    startROM(rom)
}

document.getElementById("rom").value = rom;
function changeROMLink() {
    let text = document.getElementById("rom").value;
    rom = text;
}

startROM(rom)
let loop = null;