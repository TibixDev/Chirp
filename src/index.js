import { Emulator } from "./emu";
import { Display } from "./display";
import { Keyboard } from "./keyboard";
import { EmuDefault } from "./defaultprops";
import { Log } from "./logger";

window.Log = Log;
const keyboard = new Keyboard(EmuDefault.keyboard, EmuDefault.keyboardKeys);
document.addEventListener('keydown', e => keyboard.HandleKeyDown(e));
document.addEventListener('keyup', e => keyboard.HandleKeyUp(e));

const display = new Display(document.getElementById("display"));
const emulator = new Emulator(display, keyboard, "./roms/airplane.rom", false);
window.emulator = emulator;

const romLink = document.getElementById("romLink");
romLink.addEventListener("change", () => {
    console.log("ooo")
    emulator.ChangeROM(romLink.value);
    emulator.Reset();
});

const romFile = document.getElementById("romFile");
romFile.addEventListener("change", () => {
    const file = romFile.files[0];
    const reader = new FileReader();
    reader.onload = () => {
        const arrayBuffer = reader.result;
        const rom = new Uint8Array(arrayBuffer);
        emulator.ChangeROM(rom);
    };
    reader.readAsArrayBuffer(file);
});

const pauseBtn = document.getElementById("pauseBtn");
pauseBtn.addEventListener("click", () => {
    emulator.Pause();
    pauseBtn.innerText = emulator.isPaused ? "Resume" : "Pause";
});

const stepBtn = document.getElementById("stepBtn");
stepBtn.addEventListener("click", () => {
    emulator.Step();
});

const resetBtn = document.getElementById("resetBtn");
resetBtn.addEventListener("click", () => {
    emulator.Reset();
});