const minimist = require("minimist");
const cv = require("opencv4nodejs");
const fg = require("fast-glob");
const fse = require("fs-extra");
const path = require("path");

let args = minimist(process.argv.slice(2), {
    string: ["images_dir", "labels_to_skip"],
    boolean: true,
    default: {
        flip_images: false
    }
});

if (!args.images_dir) {
    throw new Error("--images_dir not specified.");
}

run().then(_ => {
    console.log("Run Complete");
});

async function run() {
    let images = await readImagesDirectory(args.images_dir);
    let labels_to_skip = (args.labels_to_skip || "")
        .split(";")
        .map(item => item.toLowerCase());

    for (const item of images) {
        const files = await Promise.all(
            item.images.map(async name => {
                return {
                    image: await cv.imreadAsync(name),
                    parsed: path.parse(name)
                };
            })
        );

        if (!labels_to_skip.includes(item.label.toLowerCase())) {
            if (args.flip_images) {
                const newNames = await augment_flip(files, true, true);
            }
            if (args.adjust_brightness) {
                const newNames = await augment_brightness(files);
            }
        }
    }
}

async function augment_brightness(files, brightnessDelta = 0.2) {
    let names = [];

    for (const item of files) {
        const baseDir = path.join(item.parsed.dir, "brightness");
        const baseName = path.join(baseDir, item.parsed.name);

        let writePromises = [];
        await fse.ensureDir(baseDir);

        const brighter = item.image.mul(1 + brightnessDelta);
        const darker = item.image.mul(1 - brightnessDelta);
        names.push(baseName + "_b" + item.parsed.ext);
        writePromises.push(cv.imwriteAsync(names[names.length - 1], brighter));
        names.push(baseName + "_d" + item.parsed.ext);
        writePromises.push(cv.imwriteAsync(names[names.length - 1], darker));

        await Promise.all(writePromises);
    }
}

async function augment_flip(files, flip_x, flip_y) {
    let names = [];

    for (const item of files) {
        const baseDir = path.join(item.parsed.dir, "flipped");
        const baseName = path.join(baseDir, item.parsed.name);

        let writePromises = [];
        if (flip_x || flip_y) await fse.ensureDir(baseDir);

        if (flip_x) {
            names.push(baseName + "_m_x" + item.parsed.ext);
            writePromises.push(
                flipAndWrite(item.image, 1, names[names.length - 1])
            );
        }
        if (flip_y) {
            names.push(baseName + "_m_y" + item.parsed.ext);
            writePromises.push(
                flipAndWrite(item.image, 0, names[names.length - 1])
            );
        }
        if (flip_x && flip_y) {
            names.push(baseName + "_m_xy" + item.parsed.ext);
            writePromises.push(
                flipAndWrite(item.image, -1, names[names.length - 1])
            );
        }

        await Promise.all(writePromises);
    }

    return names;
}

async function flipAndWrite(image, flipCode, name) {
    await cv.imwriteAsync(name, await image.flipAsync(flipCode));
}

async function getDirectories(imagesDirectory) {
    return await fse.readdir(imagesDirectory);
}

async function getImagesInDirectory(directory) {
    return await fg(path.join(directory, "*.jpg"));
}

async function readImagesDirectory(imagesDirectory) {
    const directories = await getDirectories(imagesDirectory);
    const result = await Promise.all(
        directories.map(async directory => {
            const p = path.join(imagesDirectory, directory);
            return getImagesInDirectory(p).then(images => {
                return { label: directory, images: images };
            });
        })
    );

    return result;
}
