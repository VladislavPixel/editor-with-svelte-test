import type { ICanvas } from "../interface";

class Canvas implements ICanvas {
	width: number;

	height: number;

	isCanvas: boolean;

	target: HTMLCanvasElement | null;

	counterLayers: number;

	currentLayer: number;

	presentationImageData: null | ImageData;

	ctx: null | CanvasRenderingContext2D;

	arrayForIndexesLayers: Array<Array<number>>;

	arrayForSaveLayers: ImageData[];

	constructor() {
		this.width = 700;
		this.height = 500;
		this.isCanvas = false;
		this.target = null;

		this.counterLayers = 0;
		this.currentLayer = 0;
		this.presentationImageData = null;
		this.ctx = null;
		this.arrayForIndexesLayers = [];
		this.arrayForSaveLayers = [];
	}

	getCanvasHTML(): HTMLCanvasElement | null {
		return this.target;
	}

	initCanvas(el: HTMLCanvasElement): void {
		this.target = el;
	}

	addLayer(): void {
		if (this.ctx) {
			const newImageDataForLayers = this.ctx.getImageData(0, 0, this.width, this.height);

			this.arrayForSaveLayers.push(newImageDataForLayers);

			this.arrayForIndexesLayers[this.counterLayers] = [];

			this.counterLayers++;
		}
	}

	resetCanvasState(): void {
		this.presentationImageData = null;

		this.isCanvas = false;

		this.target = null;

		this.ctx = null;
	}

	draw(x: number, y: number, arrRgba: number[]): void {
		const indexPixel = ((y * (this.width * 4)) + (x * 4));

		const correctPresentationImageData = this.presentationImageData as ImageData;

		const { data } = this.arrayForSaveLayers[this.currentLayer];

		if (this.currentLayer === 0) {
			if (this.checkDataIndex(indexPixel)) {
				this.arrayForIndexesLayers[this.currentLayer].push(indexPixel);
			}

			data[indexPixel] = arrRgba[0];
			data[indexPixel + 1] = arrRgba[1];
			data[indexPixel + 2] = arrRgba[2];
			data[indexPixel + 3] = arrRgba[3];

			correctPresentationImageData.data[indexPixel] = arrRgba[0];
			correctPresentationImageData.data[indexPixel + 1] = arrRgba[1];
			correctPresentationImageData.data[indexPixel + 2] = arrRgba[2];
			correctPresentationImageData.data[indexPixel + 3] = arrRgba[3];
		} else {
			if (!this.isShaded(indexPixel, this.currentLayer - 1)) {
				if (this.checkDataIndex(indexPixel)) {
					this.arrayForIndexesLayers[this.currentLayer].push(indexPixel);
				}

				data[indexPixel] = arrRgba[0];
				data[indexPixel + 1] = arrRgba[1];
				data[indexPixel + 2] = arrRgba[2];
				data[indexPixel + 3] = arrRgba[3];

				correctPresentationImageData.data[indexPixel] = arrRgba[0];
				correctPresentationImageData.data[indexPixel + 1] = arrRgba[1];
				correctPresentationImageData.data[indexPixel + 2] = arrRgba[2];
				correctPresentationImageData.data[indexPixel + 3] = arrRgba[3];
			}
		}

		this.ctx!.putImageData(correctPresentationImageData, 0, 0);
	}

	undoLayerActions(i: number): void {
		const arrTaget = this.arrayForIndexesLayers[i];

		if (window.Worker) {
			const workerDeleteLayer = new Worker("./src/workers/worker-delete-layer.ts");

			workerDeleteLayer.postMessage({ target: arrTaget, present: this.presentationImageData, arrayIndexes: this.arrayForIndexesLayers, indexTarget: i });

			workerDeleteLayer.onmessage = (message) => {
				const { present, result } = message.data;

				this.presentationImageData = present;

				this.arrayForIndexesLayers = result;

				this.ctx!.putImageData(present, 0, 0);
			};
		}
	}

	deleteLayer(indexLayer: number): void {
		this.arrayForSaveLayers = this.arrayForSaveLayers.filter((image: ImageData, i: number): ImageData | null => {
			if (i !== indexLayer) {
				return image;
			}

			return null;
		});

		this.currentLayer = this.currentLayer - 1 < 0 ? 0 : this.currentLayer - 1;

		if (this.arrayForSaveLayers.length === 0) {
			const deleteElementCanvas = document.querySelector(".canvas__element-canvas") as Element;

			this.target!.closest(".canvas__wrapper")!.removeChild(deleteElementCanvas);

			this.resetCanvasState();
		} else {
			this.undoLayerActions(indexLayer);
		}

		this.counterLayers--;
	}

	checkDataIndex(i: number): boolean {
		const layer = this.arrayForSaveLayers[this.currentLayer].data;

		if (layer[i] === 0 && layer[i + 1] === 0 && layer[i + 2] === 0 && layer[i + 3] === 0) {
			return true;
		}

		return false;
	}

	isShaded(i: number, currentLayerNumber: number): boolean {
		const layer = this.arrayForSaveLayers[currentLayerNumber].data;

		if (layer[i] === 0 && layer[i + 1] === 0 && layer[i + 2] === 0 && layer[i + 3] === 0) {
			if (currentLayerNumber === 0) {
				return false;
			}

			return this.isShaded(i, currentLayerNumber - 1);
		}

		return true;
	}

	updateCurrentLayer(newCurrentLayer: number): void {
		this.currentLayer = newCurrentLayer;
	}

	updateSize(width: string | undefined, height: string | undefined): void {
		const setSize = (value: string | undefined, type: "width" | "height"): number => {
			const typeValue = typeof value;

			const valueNumber = Number(value);

			const isNaN = Number.isNaN(valueNumber);

			const isDefaultCase = typeValue !== "string" || value === "" || isNaN;

			if (isDefaultCase && type === "width") {
				return 700;
			}

			if (isDefaultCase && type === "height") {
				return 500;
			}

			return valueNumber;
		};

		this.width = setSize(width, "width");

		this.height = setSize(height, "height");
	}
}

export { Canvas };
