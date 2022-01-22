import { EmuDefault } from './defaultprops';
import { ToHex, ToBinary, ByteToBits, GetRandomInt } from './util';

export class Emulator {
    constructor(display, keyboard, rom ="roms/test.rom", isDebugMode = false) {
        //* Logger Setup
        Log.isDebug = isDebugMode;      
        
        //* External Variables 
        this.isDebugMode = isDebugMode;
        this.romLink = rom;
        
        this.shouldIncrementPC = true;
        this.isPaused = false;

        //* Components
        this.display = display;
        this.Reset();

        //* Constants
        this.keyboard = keyboard;
        
        this.quirks = {
            shift_VX_is_VY: false,
            jump_with_offset_legacy: false,
            store_increment_ir: false,
            draw_sprite_wrap: true
        }
        
        this.FONT = EmuDefault.font;

        this.timerLoop = null;
        this.emuLoop = null;
    }

    //* Helper Functions
    LogInstructions(len, offset = 0, index=this.pc) {
        let instructions = [];
        for (let i = 0; i < len; i++) {
            instructions.push(`0x${ToHex(this.ram[index + i + offset])}`);
        }
        return instructions;
    }
    
    //* FUNCTION DEFINITIONS
    MemCpy(ram, address, buffer) {
        if (buffer.length > 4096 - address) {
            return Log.debug(`[Memset] The buffer is too big (Expected max ${4096 - address} bytes, got ${buffer.length} bytes).`)
        }
        for(let i = 0; i < buffer.length; i++) {
            ram[address + i] = buffer[i];
        }
    }
    
    LoadROM(url) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => {
                buffer = new Uint8Array(buffer);
                console.log(`[readROM] Fetched ${buffer.byteLength} bytes from "${url}"`);
                this.MemCpy(this.ram, 0x200, buffer);
                console.log(this.ram);
                console.log(`[readROM] Stored ${buffer.byteLength} bytes in this.ram (${this.ram.byteLength})`);
                this.Start();
            })
    }
    
    Start() {
        console.log(`Emulation started...`);
        console.log(this);
        this.MemCpy(this.ram, 0, this.FONT);
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
    
    Pause() {
        this.isPaused = !this.isPaused;
    }
    
    Reset() {
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
        this.display.ResetScreen();
        if (this.isPaused) {
            this.Pause();
        }
        this.LoadROM(this.romLink)
    }

    ChangeROMLink(rom) {
        this.romLink = rom;
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
        const opcode = (instruction & 0xF000) >> 12;
        const x = (instruction & 0x0F00) >> 8;
        const y = (instruction & 0x00F0) >> 4;
        const n = instruction & 0x000F;
        const nn = instruction & 0x00FF;
        const nnn = instruction & 0x0FFF;
    
        switch (opcode) {
            // Clear Screen (00E0) && Call Return (00EE)
            case 0x0:
                if (nn === 0xE0) {
                    Log.debug("[0x00E0] Clear Screen")
                    this.display.ResetScreen();
                } else if (nn === 0xEE) {
                    this.pc = this.stack.pop()
                    Log.debug(`[0x00EE] Call Return ${this.pc}`)
                    this.shouldIncrementPC = false;
                }
                break;
    
            // Jump (1NNN)
            case 0x1:
                Log.debug(`[0x1] Jumping to ${nnn} from ${this.pc}`)
                this.pc = nnn;
                this.shouldIncrementPC = false;
                break;
    
            // Call (2NNN)
            case 0x2:
                Log.debug(`[0x2] Call ${nnn} from ${this.pc}`)
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
                Log.debug(`[0x6] Set this.regs[${x}] to ${nn}`);
                this.regs[x] = nn;
                break;
            
            // Add to VX (7XNN)
            case 0x7:
                Log.debug(`[0x7] Added ${nn} to this.regs[${x}] (${this.regs[x]} -> ${this.regs[x] + nn})`);
                this.regs[x] += nn;
                // Overflow (this.regs[0xF] not affected here)
                if (this.regs[x] > 255) {
                    this.regs[x] -= 256;
                }
                break;
            
            
            // Set
            case 0x8:
                Log.debug(`[0x8] Set`);
                switch (n) {
                    // Set VX -> VY (8XY0)
                    case 0:
                        Log.debug(`[0x8] > Case 8XY0 [VX = VY] ${this.regs[x]} -> ${this.regs[y]}`);
                        this.regs[x] = this.regs[y];
                        break;
                    
                    // Set VX to VX | VY
                    case 1:
                        Log.debug(`[0x8] > Case 8XY1 [VX = VX | VY] ${this.regs[x]} | ${this.regs[y]} (${this.regs[x] | this.regs[y]})`);
                        this.regs[x] = this.regs[x] | this.regs[y];
                        break;
    
                    // Set VX to VX & VY
                    case 2:
                        Log.debug(`[0x8] > Case 8XY2 [VX = VX & VY] ${this.regs[x]} & ${this.regs[y]} (${this.regs[x] & this.regs[y]})`);
                        this.regs[x] = this.regs[x] & this.regs[y];
                        break;
                    
                    // Set VX to VX ^ VY
                    case 3:
                        Log.debug(`[0x8] > Case 8XY3 [VX = VX ^ VY] ${this.regs[x]} ^ ${this.regs[y]} (${this.regs[x] ^ this.regs[y]})`);
                        this.regs[x] = this.regs[x] ^ this.regs[y];
                        break;
    
                    // Set VX to VX + VY
                    case 4:
                        Log.debug(`[0x8] > Case 8XY4 [VX = VX + VY] ${this.regs[x]} + ${this.regs[y]} (${this.regs[x] + this.regs[y]})`);
                        this.regs[x] = this.regs[x] + this.regs[y];
                        // Overflow
                        if (this.regs[x] > 255) {
                            Log.debug(`[0x8] >> Overflow ${this.regs[x]} -> ${this.regs[x] - 256}`);
                            this.regs[x] -= 256;
                            this.regs[0xF] = 1;
                        } else {
                            this.regs[0xF] = 0;
                        }
                        break;
                    
                    // Set VX to VX - VY
                    case 5:
                        Log.debug(`[0x8] > Case 8XY5 [VX = VX - VY] ${this.regs[x]} - ${this.regs[y]} (${this.regs[x] - this.regs[y]})`);
                        this.regs[x] = this.regs[x] - this.regs[y];
                        // Underflow
                        // if (this.regs[x] > this.regs[y]) {
                        if (this.regs[x] >= 0) {
                            this.regs[0xF] = 1;
                        } else {
                            Log.debug(`[0x8] >> Underflow ${this.regs[x]} -> ${this.regs[x] + 256}`);
                            this.regs[x] += 256;
                            this.regs[0xF] = 0;
                        }
                        break;
    
                    // Set VX to VY - VX
                    case 7:
                        Log.debug(`[0x8] > Case 8XY5 [VX = VY - VX] ${this.regs[y]} - ${this.regs[x]} (${this.regs[y] - this.regs[x]})`);
                        this.regs[x] = this.regs[y] - this.regs[x];
                        // Underflow
                        //if (this.regs[y] > this.regs[x]) {
                        if (this.regs[x] >= 0) {
                            this.regs[0xF] = 1;
                        } else {
                            Log.debug(`[0x8] >> Underflow ${this.regs[x]} -> ${this.regs[x] + 256}`);
                            this.regs[x] += 256;
                            this.regs[0xF] = 0;
                        }
                        break;
    
                    // Shift VX >> 1
                    case 6: {
                        if (this.quirks.shift_VX_is_VY) {
                            this.regs[x] = this.regs[y];
                        }
                        Log.debug(`[0x8] > Case 8XY6 [VX = VX >> 1] ${this.regs[x]} >> 1 (${this.regs[x] >> 1})`);
                        let flag = 0;
                        if (this.regs[x] & 0x01) {
                            Log.debug(`[0x8] >> SetFlag 1`);
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
                        Log.debug(`[0x8] > Case 8XYE [VX = VX << 1] ${this.regs[x]} << 1 (${(this.regs[x] << 1) & 0xFF})`);
                        let flag = 0;
                        if (this.regs[x] & 0x80) {
                            Log.debug(`[0x8] >> SetFlag 1`);
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
                Log.debug(`[0xA] Setting this.ir to nnn (${this.ir} -> ${nnn})`);
                // Log.debug(`Setting this.ir to ${nnn}`);
                this.ir = nnn;
                break;
    
            // Jump with offset (BNNN)
            case 0xB:
                if (this.quirks.jump_with_offset_legacy) {
                    Log.debug(`[0xB] LEGACY: Jumping to nnn + this.regs[0] (${this.pc} -> [${nnn} + ${this.regs[0]}] -> ${nnn + this.regs[0]})`);
                    this.pc = nnn + this.regs[0];
                    this.shouldIncrementPC = false;
                } else {
                    // TODO: Test, this is very questionable.
                    Log.debug(`[0xB] Jumping to x + nn + this.regs[x] (${this.pc} -> [${x} + ${nn} + ${this.regs[x]}] -> ${x + nn + this.regs[x]})`);
                    this.pc = x + nn + this.regs[x];
                    this.shouldIncrementPC = false;
                }
                break;
            
            // Random
            case 0xC:
                this.regs[x] = GetRandomInt(256) & nn;
                Log.debug(`[0xC] Supplying random int ${this.regs[x]}`);
                break;
            
            /// Draw (DXYN)
            case 0xD:
                Log.debug("[0xD] Drawing")
                let coordX = this.regs[x] & 63;
                let coordY = this.regs[y] & 31;
                this.regs[0xf] = 0;
                for (let i = 0; i < n; i++) {
                    // Log.debug(`[0xD] > this.ir: ${this.ir}, this.ir+i: ${this.ir+i}. byte: ${this.ram[this.ir+i]}`)
                    let sprite_row = this.ram[this.ir+i];
                    let bits = ByteToBits(sprite_row).reverse();
                    Log.debug("[0xD] > SpriteRow bytes: " + bits.join("").replaceAll(0, "⬛").replaceAll(1, "⬜"))
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
                        if (bits[j] === 1 && this.display.pixels[jx][jy] === 1) {
                            this.display.pixels[jx][jy] = 0;
                            this.regs[0xf] = 1;
                        } else if (bits[j] === 1 && this.display.pixels[jx][jy] !== 1) {
                            this.display.pixels[jx][jy] = 1;
                        }
                    }
                }
                this.display.DrawPixels();
                break;
        
            /// Skip if key (EX9E && EXA1)
            case 0xE:
                Log.debug(`[0xE] Skip if key (${ToHex(nn)} - ${this.keyboard.keys[this.regs[x]]})`)
                if (nn === 0x9E && this.keyboard.keys[this.regs[x]] === 1) {
                    Log.debug(`[0xEX9E] Incrementing this.pc (${this.pc} -> ${this.pc + 2}) because ${this.keyboard.keys[this.regs[x]]} was held.`);
                    this.pc+=2;
                }
                else if (nn === 0xA1 && this.keyboard.keys[this.regs[x]] === 0) {
                    Log.debug(`[0xEXA1] Incrementing this.pc (${this.pc} -> ${this.pc + 2}) because ${this.keyboard.keys[this.regs[x]]} wasn't held.`);
                    this.pc+=2;
                }
                break;
    
            // A ton of stuff.
            case 0xF:
                // console.log(`[0xF] Got F instruction with nn ${nn}`)
                switch (nn) {
                    // Set this.delayTimer -> VX (FX07)
                    case 7:
                        Log.debug(`[0xFX07] Setting this.regs[x] to this.delayTimer (${this.regs[x]} -> ${this.delayTimer})`);
                        this.regs[x] = this.delayTimer;
                        break;
                    
                    // Set VX -> this.delayTimer (FX15)
                    case 0x15:
                        Log.debug(`[0xFX15] Setting this.delayTimer to this.regs[x] (${this.delayTimer} -> ${this.regs[x]})`);
                        this.delayTimer = this.regs[x];
                        break;
    
                    // Set VX -> this.soundTimer (FX18)
                    case 0x18:
                        Log.debug(`[0xFX18] Setting this.soundTimer to this.regs[x] (${this.soundTimer} -> ${this.regs[x]})`);
                        this.soundTimer = this.regs[x];
                        break;
    
                    // Add to this.ir (FX1E)
                    case 0x1E:
                        Log.debug(`[0xFX1E] Adding this.regs[x] to this.ir (${this.ir} -> ${this.ir + this.regs[x]})`);
                        this.ir += this.regs[x];
                        // Overflow
                        if (this.ir > 4095) {
                            this.ir -= 4096;
                            this.regs[0xf] = 1;
                        }
                        break;
                    
                    // this.FONT Character (FX29) 
                    case 0x29: 
                        Log.debug(`[0xFX29] Fetching this.FONT character ${this.regs[x]} at addr ${this.regs[x]*5}`);
                        this.ir = (this.regs[x]&15)*5;
                        break;
                    
                    // Binary-coded decimal conversion
                    case 0x33:
                        let digits = parseInt(this.regs[x]).toString().split('').map(Number);
                        this.MemCpy(this.ram, this.ir, digits)
                        Log.debug(`[0xFX33] Converted ${this.regs[x]} into decimal (${digits}) and placed into this.ram at addr ${this.ir}`);
                        break;
    
                    // Store this.regs in memory (FX55)
                    case 0x55:
                        Log.debug(`[0xFX55] Storing this.regs in this.ram at addr ${this.ir} with x ${x}`);
                        for (let i = 0; i < x+1; i++) {
                            if (this.quirks.store_increment_ir) {
                                this.ir++;
                            }
                            const addr = this.quirks.store_increment_ir ? this.ir : this.ir + i;
                            this.MemCpy(this.ram, addr, [this.regs[i]])
                        }
                        break;
    
                    // Load this.regs from memory (FX65)
                    case 0x65:
                        Log.debug(`[0xFX65] Loading this.ram into this.regs from addr ${this.ir} with x: ${x}`);
                        for (let i = 0; i < x+1; i++) {
                            if (this.quirks.store_increment_ir) {
                                this.ir++;
                            }
                            const addr = this.quirks.store_increment_ir ? this.ir : this.ir + i;
                            Log.debug(`[0xFX65] > ${this.ram[addr]}`);
                            this.regs[i] = this.ram[addr];
                        }
                        break;
    
                    // Wait for key (FXA0)
                    case 0xA:
                        Log.debug(`[0xFXA0] Waiting for key`);
                        let toggledKey = keyboard.keys.findIndex(k => k === 1);
                        if (toggledKey == -1) {
                            this.shouldIncrementPC = false;
                        } else {
                            Log.debug(`[0xFXA0] Got key ${toggledKey}, continuing...`);
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
}