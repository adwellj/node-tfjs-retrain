// @ts-check
const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-node");
global.fetch = require("node-fetch");

const minimist = require("minimist");
const model = require("./model");
const data = require("./data");
const ui = require("./ui_mock");

let imageDir;
let modelDir;
let skipTraining = false;

const Model = new model();

async function init() {
    await data.loadLabelsAndImages(imageDir);

    console.time("Loading Model");
    await Model.init();
    console.timeEnd("Loading Model");
}

async function testModel() {
    console.log("Testing Model");
    await Model.loadModel(modelDir);

    if (Model.model) {
        console.time("Testing Predictions");
        console.log(Model.model.summary());

        let totalMislabeled = 0;
        let mislabeled = [];
        let imageIndex = 0;
        data.labelsAndImages.forEach(item => {
            let results = [];
            item.images.forEach(img_filename => {
                tf.tidy(() => {
                    let embeddings = data.dataset
                        ? data.getEmbeddingsForImage(imageIndex++)
                        : data.fileToTensor(img_filename);

                    let prediction = Model.getPrediction(embeddings);
                    results.push({
                        class: prediction.label,
                        probability: (
                            Number(prediction.confidence) * 100
                        ).toFixed(1)
                    });
                    if (prediction.label !== item.label) {
                        mislabeled.push({
                            class: item.label,
                            prediction: prediction.label,
                            filename: img_filename
                        });
                        totalMislabeled++;
                    }
                });
            });
            console.log({
                label: item.label,
                predictions: results.slice(0, 10)
            });
        });
        console.timeEnd("Testing Predictions");
        console.log(mislabeled);
        const totalImages = data.labelsAndImages
            .map(item => item.images.length)
            .reduce((p, c) => p + c);
        console.log(`Total Mislabeled: ${totalMislabeled} / ${totalImages}`);
    }
}

async function trainModel() {
    await data.loadTrainingData(Model.decapitatedMobilenet);
    console.log("Loaded Training Data");

    if (data.dataset.images) {
        const trainingParams = {
            batchSizeFraction: ui.getBatchSizeFraction(),
            denseUnits: ui.getDenseUnits(),
            epochs: ui.getEpochs(),
            learningRate: ui.getLearningRate(),
            trainStatus: ui.trainStatus
        };

        const labels = data.labelsAndImages.map(element => element.label);
        const trainResult = await Model.train(
            data.dataset,
            labels,
            trainingParams
        );
        console.log("Training Complete!");
        const losses = trainResult.history.loss;
        console.log(
            `Final Loss: ${Number(losses[losses.length - 1]).toFixed(5)}`
        );

        console.log(Model.model.summary());
    } else {
        new Error("Must load data before training the model.");
    }
}

let args = minimist(process.argv.slice(2), {
    string: ["images_dir", "model_dir"],
    boolean: true,
    default: {
        skip_training: false
    }
});

if (!args.images_dir) {
    throw new Error("--images_dir not specified.");
}

if (!args.model_dir) {
    throw new Error("--model_dir not specified.");
}

imageDir = args.images_dir;
modelDir = args.model_dir;
skipTraining = args.skip_training;

init()
    .then(async () => {
        if (skipTraining) return;

        try {
            await trainModel();

            await Model.saveModel(modelDir);
        } catch (error) {
            console.error(error);
        }
    })
    .then(() => {
        testModel();
    });
