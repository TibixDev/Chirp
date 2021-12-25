let ram = new Uint8Array(4096);
let canvas = document.getElementById("display");
let ctx = canvas.getContext("2d");
canvas.style.width = "1024px";
canvas.style.height = "512px";
canvas.width = 64;
canvas.height = 32;
let pc = 0;
let stack = [];
let ir = 0;
let delay_timer = 0;
let sound_timer = 0;

const regs = Array(16).fill(0);

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

const pixels = Array(64).fill().map(()=>Array(32).fill(0))
console.log(pixels)


//* HELPERS
function hex(num) {
    return num.toString(16).padStart(4, "0");
}

function binary(num) {
    return num.toString(2).padStart(16, "0");
}

//* FUNCTION DEFINITIONS
function drawPixels() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    for (let x = 0; x < 64; x++) {
        for (let y = 0; y < 32; y++) {
            if (pixels[x][y] == 1) {
                ctx.fillRect(x, y, 1, 1);
            }
        }
    }
}

function readROM(url) {
    return fetch(url)
        .then(response => response.arrayBuffer())
        .then(buffer => {
            buffer = new Uint8Array(buffer);
            console.log(`[readROM] Fetched ${buffer.byteLength} bytes from "${url}"`);
            for (let i = 0x0; i < buffer.byteLength; i++) {
                ram[i] = buffer[i];
            }
            console.log(`[readROM] Stored ${buffer.byteLength} bytes in RAM (${ram.byteLength})`);
        })
}

function processCycle() {
    const instruction = ram[pc] << 8 | ram[pc + 1];
    pc += 2;
    processInstruction(instruction);
}

function processInstruction(instruction) {
    //console.log(`opcode: ${hex(instruction)} && mask: ${hex(instruction & 0xF000)} && shifted: ${hex((instruction & 0xF000) >> 12)}`);
    const opcode = (instruction & 0xF000) >> 12;
    const x = (instruction & 0x0F00) >> 8;
    const y = (instruction & 0x00F0) >> 4;
    const n = instruction & 0x000F;
    const nn = instruction & 0x00FF;
    const nnn = instruction & 0x0FFF;
    // console.log(`opcode: ${opcode}, x: ${x}, y: ${y}, n: ${n}, nn: ${nn}, nnn: ${nnn}`);

    switch (opcode) {
        // Clear Screen
        case 0x00E0:
            console.log("clear screen opcode triggered")
            ctx.fillStyle = "black";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            break;

        // Jump (1NNN)
        case 0x1:
            console.log(`JMP to ${nnn}`)
            pc = nnn;
            break;

        // Set register VX (6XNN)
        case 0x6:
            console.log(`Set regs[${x}] to ${nn}`)
            regs[x] = nn;
            break;
        
        // Add to VX (7XNN)
        case 0x7:
            console.log(`Added ${nn} to regs[${x}] (${regs[x]} -> ${regs[x] + nn})`)
            regs[x] += nn;
            break;
        
        // Set IR (ANNN)
        case 0xA:
            console.log(`Setting IR to ${nnn}`)
            ir = nnn;
            break;

        /// Draw (DXYN)
        case 0xE: {
            console.log("Drawing stuff")
            let coord_x = regs[x] & 63;
            let coord_y = regs[y] & 31;
            regs[0xf] = 0;
            for (let i = 0; i < n*8; i++) {
                let sprdata = ram[i + ir];
                console.log(binary(ram[i + ir]));
                let pixels = sprdata.toString(2).split("").map(Number)
                for (let k = 0; k < pixels.length; k++) {
                    if (coord_y)
                    if (pixels[k] === 0x1 && pixels[x][y] === 0x1) {
                        pixels[x][y] = 0x0;
                        regs[0xf] = 0x1;
                    } else if(pixels[k] === 0x1 & pixels[x][y] === 0x0) {
                        pixels[x][y] = 0x1;
                    }
                    coord_x++;
                }
                coord_y++;
            }
            break;
        }

        case 0xD:
            console.log("Drawing stuff")
            let coord_x = regs[x] & 63;
            let coord_y = regs[y] & 31;
            regs[0xf] = 0;
            console.log(`N: ${n}`)
            for (let i = 0; i < n; i++) {
                let sprite_data = ram[ir+i];
                let bits = sprite_data.toString(2).split("").map(Number)
                for (let j = 0; j < 8; j++) {
                    if (bits[coord_x][coord_y] === 1) {
                        if (pixels[coord_x][coord_y] === 1) {
                            regs[0xf] = 1;
                        }
                        pixels[coord_x][coord_y] ^= 1;
                        coord_x++;
                    }
                }
                coord_y++;
            }
            break;
            
    }
}

readROM("./roms/ibm.rom")
const loop = setInterval(() => {
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