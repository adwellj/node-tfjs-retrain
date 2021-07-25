.PHONY: train

train:
	node ./app.js  --images_dir=/store/storage/p-block/images/  --model_dir=/tmp/model
