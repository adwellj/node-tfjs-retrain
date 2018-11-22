// @ts-check
const tf = require("@tensorflow/tfjs");
require("@tensorflow/tfjs-node");
global.fetch = require("node-fetch");

const model = require("./model");
const data = require("./data");
const ui = require("./ui_mock");
const path = require("path");

let imageDir;
let projectName;

async function init() {
    await data.loadLabelsAndImages(imageDir);

    console.time("Loading Model");
    await model.init();
    console.timeEnd("Loading Model");
}

async function testModel() {
    console.log("Testing Model");
    await model.loadModel(projectName);

    if (model.model) {
        console.time("Testing Predictions");
        console.log(model.model.summary());

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

                    let prediction = model.getPrediction(embeddings);
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
        console.log(`Total Mislabeled: ${totalMislabeled}`);
    }
}

async function trainModel() {
    await data.loadTrainingData(model.decapitatedMobilenet);
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
        const trainResult = await model.train(
            data.dataset,
            labels,
            trainingParams
        );
        console.log("Training Complete!");
        const losses = trainResult.history.loss;
        console.log(
            `Final Loss: ${Number(losses[losses.length - 1]).toFixed(5)}`
        );

        console.log(model.model.summary());
    } else {
        new Error("Must load data before training the model.");
    }
}

if (process.argv.length < 3) {
    throw new Error(
        "Incorrect Arguments: node app.js <IMAGE_DIR> <NO_RETRAIN?>"
    );
}

imageDir = process.argv[2];
projectName = path.basename(path.dirname(imageDir));

init()
    .then(async () => {
        const skipTraining =
            process.argv.length === 4 &&
            process.argv[3].toLowerCase() === "true";

        if (skipTraining) return;

        try {
            await trainModel();

            await model.saveModel(projectName);
        } catch (error) {
            console.error(error);
        }
    })
    .then(() => {
        testModel();
    });
