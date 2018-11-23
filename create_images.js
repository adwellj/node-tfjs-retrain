// @ts-check
const fse = require("fs-extra");
const jpeg = require("jpeg-js");
const path = require("path");

let imageDir;
const image_width = 280;
const image_height = image_width;
const colors = [
    { name: "red", rgb: [255, 0, 0] },
    { name: "green", rgb: [0, 255, 0] },
    { name: "blue", rgb: [0, 0, 255] },
    { name: "cyan", rgb: [0, 255, 255] },
    { name: "magenta", rgb: [255, 0, 255] },
    { name: "yellow", rgb: [255, 255, 0] },
    { name: "black", rgb: [0, 0, 0] }
];

async function createAllImages() {
    await colors.forEach(async element => {
        await createColorImages(element.name, element.rgb, 20);
    });
}

async function createColorImages(colorName, rgbArray, numToCreate) {
    let dir = path.join(imageDir, colorName);
    await fse.ensureDir(dir);

    for (let index = 0; index < numToCreate; index++) {
        let jpegImageData = encodeImage(rgbArray[0], rgbArray[1], rgbArray[2]);
        let filename = path.join(dir, `${colorName}_${index.toString()}.jpg`);
        await fse.writeFile(filename, jpegImageData.data);
    }
}

function randRGB(r, g, b) {
    let val = Math.random();
    if (val >= 0.25) {
        return {
            r: r * val,
            g: g * val,
            b: b * val
        };
    } else {
        return {
            r: 255,
            g: 255,
            b: 255
        };
    }
}

function encodeImage(r, g, b) {
    let frameData = Buffer.alloc(image_width * image_height * 4);
    let i = 0;

    while (i < frameData.length) {
        let color = randRGB(r, g, b);
        frameData[i++] = color.r; // red
        frameData[i++] = color.g; // green
        frameData[i++] = color.b; // blue
        frameData[i++] = 0xff; // alpha - ignored in JPEGs
    }

    let rawImageData = {
        data: frameData,
        width: image_width,
        height: image_height
    };
    return jpeg.encode(rawImageData, 75);
}

if (process.argv.length < 3) {
    throw new Error("Incorrect Arguments: node create_images.js <IMAGE_DIR>");
}

imageDir = process.argv[2];
createAllImages();
