class Emulator {
    constructor(canvas, document) {
        //* Document
        this.document = document;

        //* Display
        this.canvas = document.getElementById(canvas);
        //let this.ctx = canvas.getContext("2d", { alpha: false });
        this.ctx = this.canvas.getContext("2d");
        this.canvas.style.width = "1024px";
        this.canvas.style.height = "512px";
        this.canvas.width = 64;
        this.canvas.height = 32;
        
        //* Components
        this.ResetEmu();
        //this.ram = EmuDefault.ram;
        //this.pc = EmuDefault.pc;
        //this.stack = EmuDefault.stack;
        //this.ir = EmuDefault.ir;
        //this.regs = EmuDefault.regs;
        //this.pixels = EmuDefault.pixels;
        //this.keyboard = EmuDefault.keyboard;
        this.delayTimer = EmuDefault.delayTimer;
        this.soundTimer = EmuDefault.soundTimer;
        
        //* External Variables 
        this.isDebugMode = false;
        this.romLink = "./roms/test.rom"
        
        this.shouldIncrementPC = true;
        this.isPaused = false;
        
        //* Constants
        // const this.keyboardKeys = [49, 50, 51, 52, 81, 87, 69, 62, 65, 83, 68, 70, 89, 88, 67, 86]
        // this.keyboardKeys = [88, 49, 50, 51, 81, 87, 69, 65, 83, 68, 89, 67, 52, 62, 70, 86]
        this.keyboardKeys = EmuDefault.keyboardKeys;
        this.keyboard = EmuDefault.keyboard;
        
        this.quirks = {
            shift_VX_is_VY: false,
            jump_with_offset_legacy: false,
            store_increment_ir: false,
            draw_sprite_wrap: true
        }
        
        this.FONT = EmuDefault.font;

        this.timerLoop = null;
        this.emuLoop = null;
        this.StartROM(this.romLink)

        this.document.getElementById("rom").value = this.romLink;
        this.document.addEventListener('keydown', e => this.HandleKeyDown(e));
        this.document.addEventListener('keyup', e => this.HandleKeyUp(e));
    }

    //* Helper Functions
    LogDebug(inp) {
        if (this.isDebugMode) {
            console.log(inp)
        }
    }
    
    ToHex(num) {
        return num.toString(16).padStart(4, "0");
    }
    
    ToBinary(num) {
        return num.toString(2).padStart(16, "0");
    }
    
    ByteToBits(byte) {
        return [...Array(8)].map((x,idx)=>byte>>idx&1);
    }
    
    GetRandomInt(max) {
        return Math.floor(Math.random() * max);
    }
    
    LogInstructions(len, offset = 0, index=this.pc) {
        let instructions = [];
        for (let i = 0; i < len; i++) {
            instructions.push(`0x${this.ToHex(this.ram[index + i + offset])}`);
        }
        return instructions;
    }
    
    //* FUNCTION DEFINITIONS
    MemSet(ram, address, buffer) {
        if (buffer.length > 4096 - address) {
            return this.LogDebug(`[Malloc] The buffer is too big (Expected max ${4096 - address} bytes, got ${buffer.length} bytes).`)
        }
        for(let i = 0; i < buffer.length; i++) {
            ram[address + i] = buffer[i];
        }
    }
    
    StartROM(url) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => {
                buffer = new Uint8Array(buffer);
                console.log(`[readROM] Fetched ${buffer.byteLength} bytes from "${url}"`);
                this.MemSet(this.ram, 0x200, buffer);
                console.log(`[readROM] Stored ${buffer.byteLength} bytes in this.ram (${this.ram.byteLength})`);
                this.StartEmu();
            })
    }
    
    DrawPixels() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "lightblue";
        
        for (let x = 0; x < 64; x++) {
            for (let y = 0; y < 32; y++) {
                //^ Rainbow Mode
                // this.ctx.fillStyle = "#" + Math.floor(Math.random()*16777215).toString(16);
                if (this.pixels[x][y] == 1) {
                    this.ctx.fillRect(x, y, 1, 1);
                }
            }
        }
        
        /* This might be faster one day, until then it lies in this comment
        console.time("dPutImageData");
        let pixelData = Uint8ClampedArray.from(this.pixels.flat().flatMap(pixel => pixel === 1 ? [0, 190, 0, 255] : [0, 0, 0, 255]));
        let imageData = new ImageData(pixelData, 64, 32);
        this.ctx.putImageData(imageData, 0, 0)
        console.timeEnd("dPutImageData");
        */
    }
    
    StartEmu() {
        this.MemSet(this.ram, 0, this.FONT);
        this.timerLoop = setInterval(() => {
            if (!this.isPaused) {
                // Dec delay and sound timers
                if (this.delayTimer > 0) {
                    this.delayTimer--;
                }
                if (this.soundTimer > 0) {
                    this.soundTimer--;
                }
            }
        }, 13.3)
        this.emuLoop = setInterval(() => {
            if (!this.isPaused) {
                this.ProcessCycle();
            }
        }, 20);
    }
    
    PauseEmu() {
        this.isPaused = !this.isPaused;
        if (this.isPaused) {
            this.document.getElementById("pauseBtn").textContent = "continue"
        } else {
            this.document.getElementById("pauseBtn").textContent = "pause"
        }
    }
    
    ResetEmu() {
        console.log("Resetting emulator...")
        clearInterval(this.timerLoop);
        clearInterval(this.emuLoop);
        this.ram = EmuDefault.ram;
        this.pc = EmuDefault.pc;
        this.stack = EmuDefault.stack;
        this.ir = EmuDefault.ir;
        this.delayTimer = EmuDefault.delayTimer;
        this.soundTimer = EmuDefault.soundTimer;
        this.regs = EmuDefault.regs;
        this.pixels = EmuDefault.pixels;    
        if (this.isPaused) {
            this.PauseEmu();
        }
        this.StartROM(this.romLink)
    }
    
    ProcessCycle() {
        for (let i = 0; i < 10; i++) {
            const instruction = this.ram[this.pc] << 8 | this.ram[this.pc + 1];
            //console.time("instruction");
            this.ProcessInstruction(instruction);
            //console.timeEnd("instruction");
            if (this.shouldIncrementPC) {        
                this.pc += 2;
            }
            this.shouldIncrementPC = true;
        }
    }
    
    ProcessInstruction(instruction) {
        // this.LogDebug(`othis.pcode: ${hex(instruction)} && mask: ${hex(instruction & 0xF000)} && shifted: ${hex((instruction & 0xF000) >> 12)}`);
        const opcode = (instruction & 0xF000) >> 12;
        const x = (instruction & 0x0F00) >> 8;
        const y = (instruction & 0x00F0) >> 4;
        const n = instruction & 0x000F;
        const nn = instruction & 0x00FF;
        const nnn = instruction & 0x0FFF;
        // this.LogDebug(`[processor] this.pc: ${this.pc} othis.pcode: ${othis.pcode}, x: ${x}, y: ${y}, n: ${n}, nn: ${nn}, nnn: ${nnn}`);
    
        switch (opcode) {
            // Clear Screen (00E0) && Call Return (00EE)
            case 0x0:
                if (nn === 0xE0) {
                    this.LogDebug("[0x00E0] Clear Screen")
                    this.pixels = Array(64).fill().map(()=>Array(32).fill(0))
                    // this.ctx.fillStyle = "black";
                    // this.ctx.fillRect(0, 0, canvas.width, canvas.height);
                } else if (nn === 0xEE) {
                    this.pc = this.stack.pop()
                    this.LogDebug(`[0x00EE] Call Return ${this.pc}`)
                    this.shouldIncrementPC = false;
                }
                break;
    
            // Jump (1NNN)
            case 0x1:
                this.LogDebug(`[0x1] Jumping to ${nnn} from ${this.pc}`)
                this.pc = nnn;
                this.shouldIncrementPC = false;
                break;
    
            // Call (2NNN)
            case 0x2:
                this.LogDebug(`[0x2] Call ${nnn} from ${this.pc}`)
                this.stack.push(this.pc+2)
                this.pc = nnn;
                this.shouldIncrementPC = false;
                break;
    
            // Skip Equal (3XNN)
            case 0x3:
                if (this.regs[x] === nn) {
                    this.pc+=2;
                }
                break;
    
            // Skip Not Equal (4XNN)
            case 0x4:
                if (this.regs[x] !== nn) {
                    this.pc+=2;
                }
                break;
    
            // Skip VXVY equal (5XY0)
            case 0x5:
                if (this.regs[x] === this.regs[y]) {
                    this.pc+=2;
                }
                break;
    
            // Skip VXVY not equal (9XY0)
            case 0x9:
                if (this.regs[x] !== this.regs[y]) {
                    this.pc+=2;
                }
                break;
    
            // Set register VX (6XNN)
            case 0x6:
                this.LogDebug(`[0x6] Set this.regs[${x}] to ${nn}`);
                this.regs[x] = nn;
                break;
            
            // Add to VX (7XNN)
            case 0x7:
                this.LogDebug(`[0x7] Added ${nn} to this.regs[${x}] (${this.regs[x]} -> ${this.regs[x] + nn})`);
                this.regs[x] += nn;
                // Overflow (this.regs[0xF] not affected here)
                if (this.regs[x] > 255) {
                    this.regs[x] -= 256;
                }
                break;
            
            
            // Set
            case 0x8:
                this.LogDebug(`[0x8] Set`);
                switch (n) {
                    // Set VX -> VY (8XY0)
                    case 0:
                        this.LogDebug(`[0x8] > Case 8XY0 [VX = VY] ${this.regs[x]} -> ${this.regs[y]}`);
                        this.regs[x] = this.regs[y];
                        break;
                    
                    // Set VX to VX | VY
                    case 1:
                        this.LogDebug(`[0x8] > Case 8XY1 [VX = VX | VY] ${this.regs[x]} | ${this.regs[y]} (${this.regs[x] | this.regs[y]})`);
                        this.regs[x] = this.regs[x] | this.regs[y];
                        break;
    
                    // Set VX to VX & VY
                    case 2:
                        this.LogDebug(`[0x8] > Case 8XY2 [VX = VX & VY] ${this.regs[x]} & ${this.regs[y]} (${this.regs[x] & this.regs[y]})`);
                        this.regs[x] = this.regs[x] & this.regs[y];
                        break;
                    
                    // Set VX to VX ^ VY
                    case 3:
                        this.LogDebug(`[0x8] > Case 8XY3 [VX = VX ^ VY] ${this.regs[x]} ^ ${this.regs[y]} (${this.regs[x] ^ this.regs[y]})`);
                        this.regs[x] = this.regs[x] ^ this.regs[y];
                        break;
    
                    // Set VX to VX + VY
                    case 4:
                        this.LogDebug(`[0x8] > Case 8XY4 [VX = VX + VY] ${this.regs[x]} + ${this.regs[y]} (${this.regs[x] + this.regs[y]})`);
                        this.regs[x] = this.regs[x] + this.regs[y];
                        // Overflow
                        if (this.regs[x] > 255) {
                            this.LogDebug(`[0x8] >> Overflow ${this.regs[x]} -> ${this.regs[x] - 256}`);
                            this.regs[x] -= 256;
                            this.regs[0xF] = 1;
                        } else {
                            this.regs[0xF] = 0;
                        }
                        break;
                    
                    // Set VX to VX - VY
                    case 5:
                        this.LogDebug(`[0x8] > Case 8XY5 [VX = VX - VY] ${this.regs[x]} - ${this.regs[y]} (${this.regs[x] - this.regs[y]})`);
                        this.regs[x] = this.regs[x] - this.regs[y];
                        // Underflow
                        // if (this.regs[x] > this.regs[y]) {
                        if (this.regs[x] >= 0) {
                            this.regs[0xF] = 1;
                        } else {
                            this.LogDebug(`[0x8] >> Underflow ${this.regs[x]} -> ${this.regs[x] + 256}`);
                            this.regs[x] += 256;
                            this.regs[0xF] = 0;
                        }
                        break;
    
                    // Set VX to VY - VX
                    case 7:
                        this.LogDebug(`[0x8] > Case 8XY5 [VX = VY - VX] ${this.regs[y]} - ${this.regs[x]} (${this.regs[y] - this.regs[x]})`);
                        this.regs[x] = this.regs[y] - this.regs[x];
                        // Underflow
                        //if (this.regs[y] > this.regs[x]) {
                        if (this.regs[x] >= 0) {
                            this.regs[0xF] = 1;
                        } else {
                            this.LogDebug(`[0x8] >> Underflow ${this.regs[x]} -> ${this.regs[x] + 256}`);
                            this.regs[x] += 256;
                            this.regs[0xF] = 0;
                        }
                        break;
    
                    // Shift VX >> 1
                    case 6: {
                        if (this.quirks.shift_VX_is_VY) {
                            this.regs[x] = this.regs[y];
                        }
                        this.LogDebug(`[0x8] > Case 8XY6 [VX = VX >> 1] ${this.regs[x]} >> 1 (${this.regs[x] >> 1})`);
                        let flag = 0;
                        if (this.regs[x] & 0x01) {
                            this.LogDebug(`[0x8] >> SetFlag 1`);
                            flag = 1;
                        }
                        this.regs[x] = this.regs[x] >> 1;
                        this.regs[0xf] = flag;
                        break;
                    }
                    
                    // Shift VX << 1
                    case 0xE: {
                        if (this.quirks.shift_VX_is_VY) {
                            this.regs[x] = this.regs[y];
                        }
                        this.LogDebug(`[0x8] > Case 8XYE [VX = VX << 1] ${this.regs[x]} << 1 (${(this.regs[x] << 1) & 0xFF})`);
                        let flag = 0;
                        if (this.regs[x] & 0x80) {
                            this.LogDebug(`[0x8] >> SetFlag 1`);
                            flag = 1;
                        }
                        this.regs[x] = (this.regs[x] << 1) & 0xFF;
                        this.regs[0xf] = flag;
                        break;
                    }
                }
                break;
    
            // Set this.ir (ANNN)
            case 0xA:
                this.LogDebug(`[0xA] Setting this.ir to nnn (${this.ir} -> ${nnn})`);
                // this.LogDebug(`Setting this.ir to ${nnn}`);
                this.ir = nnn;
                break;
    
            // Jump with offset (BNNN)
            case 0xB:
                if (this.quirks.jump_with_offset_legacy) {
                    this.LogDebug(`[0xB] LEGACY: Jumping to nnn + this.regs[0] (${this.pc} -> [${nnn} + ${this.regs[0]}] -> ${nnn + this.regs[0]})`);
                    this.pc = nnn + this.regs[0];
                    this.shouldIncrementPC = false;
                } else {
                    // TODO: Test, this is very questionable.
                    this.LogDebug(`[0xB] Jumping to x + nn + this.regs[x] (${this.pc} -> [${x} + ${nn} + ${this.regs[x]}] -> ${x + nn + this.regs[x]})`);
                    this.pc = x + nn + this.regs[x];
                    this.shouldIncrementPC = false;
                }
                break;
            
            // Random
            case 0xC:
                this.regs[x] = this.GetRandomInt(256) & nn;
                this.LogDebug(`[0xC] Supplying random int ${this.regs[x]}`);
                break;
            
            /// Draw (DXYN)
            case 0xD:
                this.LogDebug("[0xD] Drawing")
                let coordX = this.regs[x] & 63;
                let coordY = this.regs[y] & 31;
                this.regs[0xf] = 0;
                for (let i = 0; i < n; i++) {
                    // this.LogDebug(`[0xD] > this.ir: ${this.ir}, this.ir+i: ${this.ir+i}. byte: ${this.ram[this.ir+i]}`)
                    let sprite_row = this.ram[this.ir+i];
                    let bits = this.ByteToBits(sprite_row).reverse();
                    this.LogDebug("[0xD] > SpriteRow bytes: " + bits.join("").replaceAll(0, "⬛").replaceAll(1, "⬜"))
                    for (let j = 0; j < 8; j++) {
                        let jx = coordX + j;
                        let jy = coordY + i;
    
                        if (this.quirks.draw_sprite_wrap) {
                            jx &= 63;
                            jy &= 31;
                        }
    
                        if ((jx > 63 || jy > 31) && !this.quirks.draw_sprite_wrap) {
                            break;
                        }
                        if (bits[j] === 1 && this.pixels[jx][jy] === 1) {
                            this.pixels[jx][jy] = 0;
                            this.regs[0xf] = 1;
                        } else if (bits[j] === 1 && this.pixels[jx][jy] !== 1) {
                            this.pixels[jx][jy] = 1;
                        }
                    }
                }
                this.DrawPixels();
                break;
        
            /// Skip if key (EX9E && EXA1)
            case 0xE:
                this.LogDebug("[0xE] Skip if key")
                if (nn === 0x9E && this.keyboard[this.regs[x]] === 1) {
                    this.LogDebug(`[0xEX9E] Incrementing this.pc (${this.pc} -> ${this.pc + 2}) because ${this.keyboardKeys[this.regs[x]]} was held.`);
                    this.pc+=2;
                }
                else if (nn === 0xA1 && this.keyboard[this.regs[x]] === 0) {
                    this.LogDebug(`[0xEXA1] Incrementing this.pc (${this.pc} -> ${this.pc + 2}) because ${this.keyboardKeys[this.regs[x]]} wasn't held.`);
                    this.pc+=2;
                }
                break;
    
            // A ton of stuff.
            case 0xF:
                // console.log(`[0xF] Got F instruction with nn ${nn}`)
                switch (nn) {
                    // Set this.delayTimer -> VX (FX07)
                    case 7:
                        this.LogDebug(`[0xFX07] Setting this.regs[x] to this.delayTimer (${this.regs[x]} -> ${this.delayTimer})`);
                        this.regs[x] = this.delayTimer;
                        break;
                    
                    // Set VX -> this.delayTimer (FX15)
                    case 0x15:
                        this.LogDebug(`[0xFX15] Setting this.delayTimer to this.regs[x] (${this.delayTimer} -> ${this.regs[x]})`);
                        this.delayTimer = this.regs[x];
                        break;
    
                    // Set VX -> this.soundTimer (FX18)
                    case 0x18:
                        this.LogDebug(`[0xFX18] Setting this.soundTimer to this.regs[x] (${this.soundTimer} -> ${this.regs[x]})`);
                        this.soundTimer = this.regs[x];
                        break;
    
                    // Add to this.ir (FX1E)
                    case 0x1E:
                        this.LogDebug(`[0xFX1E] Adding this.regs[x] to this.ir (${this.ir} -> ${this.ir + this.regs[x]})`);
                        this.ir += this.regs[x];
                        // Overflow
                        if (this.ir > 4095) {
                            this.ir -= 4096;
                            this.regs[0xf] = 1;
                        }
                        break;
                    
                    // this.FONT Character (FX29) 
                    case 0x29: 
                        this.LogDebug(`[0xFX29] Fetching this.FONT character ${this.regs[x]} at addr ${this.regs[x]*5}`);
                        this.ir = (this.regs[x]&15)*5;
                        break;
                    
                    // Binary-coded decimal conversion
                    case 0x33:
                        let digits = parseInt(this.regs[x]).toString().split('').map(Number);
                        this.MemSet(this.ram, this.ir, digits)
                        this.LogDebug(`[0xFX33] Converted ${this.regs[x]} into decimal (${digits}) and placed into this.ram at addr ${this.ir}`);
                        break;
    
                    // Store this.regs in memory (FX55)
                    case 0x55:
                        this.LogDebug(`[0xFX55] Storing this.regs in this.ram at addr ${this.ir} with x ${x}`);
                        for (let i = 0; i < x+1; i++) {
                            if (this.quirks.store_increment_ir) {
                                this.ir++;
                            }
                            const addr = this.quirks.store_increment_ir ? this.ir : this.ir + i;
                            this.MemSet(this.ram, addr, [this.regs[i]])
                        }
                        break;
    
                    // Load this.regs from memory (FX65)
                    case 0x65:
                        this.LogDebug(`[0xFX65] Loading this.ram this.regs into this.regs from addr ${this.ir} with x ${x}`);
                        for (let i = 0; i < x+1; i++) {
                            if (this.quirks.store_increment_ir) {
                                this.ir++;
                            }
                            const addr = this.quirks.store_increment_ir ? this.ir : this.ir + i;
                            this.regs[i] = this.ram[addr];
                        }
                        break;
    
                    // Wait for key (FXA0)
                    case 0xA:
                        this.LogDebug(`[0xFXA0] Waiting for key`);
                        let toggledKey = keyboard.findIndex(k => k === 1);
                        if (toggledKey == -1) {
                            this.shouldIncrementPC = false;
                        } else {
                            this.LogDebug(`[0xFXA0] Got key ${toggledKey}, continuing...`);
                            this.regs[x] = toggledKey;
                        }
                        break;
                    
                    default:
                        console.error("[0xF] Invalid 0xF type instruction, nnn: " + nnn);
                }
                break;
            
            default:
                console.error(`[Interpreter] Got invalid instruction (${opcode}), this should never happen.`)
    
        }
    }
    
    ChangeROMLink() {
        let text = this.document.getElementById("rom").value;
        this.romLink = text;
    }
    
    HandleKeyDown(e) {
        if (!e.repeat) {
            if (this.keyboardKeys.includes(e.keyCode)) {
                this.LogDebug(`[KeyDown] Code: ${e.code} | KeyCode: ${e.keyCode}`)
                this.keyboard[this.keyboardKeys.indexOf(e.keyCode)] = 1;
                this.LogDebug(this.keyboard);
            }
        }
    }
    
    HandleKeyUp(e) {
        if (this.keyboardKeys.includes(e.keyCode)) {
            this.LogDebug(`[KeyUp] Code: ${e.code} | KeyCode: ${e.keyCode}`)
            setTimeout(() => this.keyboard[this.keyboardKeys.indexOf(e.keyCode)] = 0, 20);
            this.LogDebug(this.keyboard);
        }
    }
}

const emulator = new Emulator("display", document);
// document.addEventListener('keydown', this.HandleKeyDown);
// document.addEventListener('keyup', this.HandleKeyUp);