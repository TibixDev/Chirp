import { Emulator } from "./emu";
import { Display } from "./display";
import { Keyboard } from "./keyboard";
import { EmuDefault } from "./defaultprops";
import { Log } from "./logger";
import Peer from 'peerjs';

window.Log = Log;
const keyboard = new Keyboard(EmuDefault.keyboard, EmuDefault.keyboardKeys);
document.addEventListener('keydown', e => keyboard.HandleKeyDown(e));
document.addEventListener('keyup', e => keyboard.HandleKeyUp(e));

const display = new Display(document.getElementById("display"));
const emulator = new Emulator(display, keyboard, "./roms/airplane.rom", false);
window.emulator = emulator;

const romLink = document.getElementById("romLink");
romLink.addEventListener("input", () => {
    emulator.ChangeROMLink(romLink.value);
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

// P2P Stuff
const peerID = `chirp-${Math.floor(Math.random() * 10000)}`;
const peer = new Peer(peerID);
console.log("Peer ID: " + peerID);

let peerConn = null;
peer.on('connection', (conn) => {
    conn.on('data', (data) => {
        console.log(data);
    });
    conn.on('open', () => {
        conn.send('hello!');
        peerConn = conn;
        window.peerConn = peerConn;
    });
});

function connect(id) {
    const conn = peer.connect(`chirp-${id}`);
    conn.on('open', () => {
      conn.send('hi!');
    });
    return conn;
}

window.peer = peer;
window.connect = connect;