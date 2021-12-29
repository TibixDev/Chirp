class EmuDefault {
    static get ram() { return new Uint8Array(4096) }
    static get pixels() { return Array(64).fill().map(()=>Array(32).fill(0)) };
    static get pc() { return 0x200 };
    static get stack() { return [] }
    static get ir() { return 0 }
    static get delayTimer() { return 0 }
    static get soundTimer() { return 0 }
    static get regs() { return Array(16).fill(0) };
    static get pixels() { return Array(64).fill().map(()=>Array(32).fill(0)) }
}