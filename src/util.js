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

export { ToHex, ToBinary, ByteToBits, GetRandomInt };