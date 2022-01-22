import { EmuDefault } from './defaultprops';

export class Display {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext("2d", { alpha: false });
        this.canvas.style.width = "1024px";
        this.canvas.style.height = "512px";
        this.canvas.width = 64;
        this.canvas.height = 32;
        this.pixels = EmuDefault.pixels;
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

    ResetScreen() {
        this.pixels = EmuDefault.pixels;
        this.DrawPixels();
    }
}