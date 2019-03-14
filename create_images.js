// @ts-check
const fse = require("fs-extra");
const sharp = require("sharp");
const path = require("path");

let imageDir;
const imgParams = {
    width: 280,
    height: 280,
    channels: 3
};
const colors = [
    { name: "red", rgb: [255, 20, 20] },
    { name: "green", rgb: [20, 255, 20] },
    { name: "blue", rgb: [20, 20, 255] },
    { name: "cyan", rgb: [20, 255, 255] },
    { name: "magenta", rgb: [255, 20, 255] },
    { name: "yellow", rgb: [255, 255, 20] },
    { name: "black", rgb: [20, 20, 20] }
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
        let filename = path.join(dir, `${colorName}_${index.toString()}.jpg`);
        let img = createSharpImage(rgbArray[0], rgbArray[1], rgbArray[2]);
        await img.toFile(filename);
    }
}

function createSharpImage(r, g, b) {
    let imgData = Buffer.alloc(
        imgParams.width * imgParams.height * imgParams.channels
    );
    let i = 0;

    while (i < imgData.length) {
        let color = randRGB(r, g, b);
        imgData[i++] = color.r;
        imgData[i++] = color.g;
        imgData[i++] = color.b;
    }
    return sharp(imgData, { raw: imgParams });
}

function randRGB(r, g, b) {
    let val = Math.random();
    if (val >= 0.1) {
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

if (process.argv.length < 3) {
    throw new Error("Incorrect Arguments: node create_images.js <IMAGE_DIR>");
}

imageDir = process.argv[2];
createAllImages();
