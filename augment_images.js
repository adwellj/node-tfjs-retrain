const minimist = require("minimist");
const sharp = require("sharp");
const fg = require("fast-glob");
const fse = require("fs-extra");
const path = require("path");

let args = minimist(process.argv.slice(2), {
    string: ["images_dir", "labels_to_skip"],
    boolean: true,
    default: {
        flip_images: false,
        adjust_brightness: false,
        ignore_subdirectories: false
    }
});

console.log(args);

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
        .map(item => item.toLowerCase().trim())
        .filter(item => item.length > 0);

    for (const item of images) {
        const files = await Promise.all(
            item.images.map(async name => {
                return {
                    image: await sharp(name),
                    parsed: path.parse(name)
                };
            })
        );

        if (!labels_to_skip.includes(item.label.toLowerCase())) {
            if (args.flip_images) {
                console.log(`Flipping: ${item.label}`);
                const newNames = await augment_flip(files, true, true);
            }
            if (args.adjust_brightness) {
                console.log(`Adjusting Brightness: ${item.label}`);
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

        const brighter = item.image.clone().linear(1 + brightnessDelta);
        const darker = item.image.clone().linear(1 - brightnessDelta);
        names.push(baseName + "_b" + item.parsed.ext);
        writePromises.push(brighter.toFile(names[names.length - 1]));
        names.push(baseName + "_d" + item.parsed.ext);
        writePromises.push(darker.toFile(names[names.length - 1]));

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
            names.push(baseName + "_f_x" + item.parsed.ext);
            writePromises.push(
                item.image
                    .clone()
                    .flop()
                    .toFile(names[names.length - 1])
            );
        }
        if (flip_y) {
            names.push(baseName + "_f_y" + item.parsed.ext);
            writePromises.push(
                item.image.flip().toFile(names[names.length - 1])
            );
        }
        if (flip_x && flip_y) {
            names.push(baseName + "_f_xy" + item.parsed.ext);
            writePromises.push(
                item.image
                    .flop()
                    .flip()
                    .toFile(names[names.length - 1])
            );
        }

        await Promise.all(writePromises);
    }

    return names;
}

async function getDirectories(imagesDirectory) {
    return await fse.readdir(imagesDirectory);
}

async function getImagesInDirectory(directory) {
    return await fg([
        path.join(directory, "*.png"),
        path.join(directory, "*.jpg")
    ]);
}

async function readImagesDirectory(imagesDirectory) {
    let directories = args.ignore_subdirectories
        ? [""]
        : await getDirectories(imagesDirectory);

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
