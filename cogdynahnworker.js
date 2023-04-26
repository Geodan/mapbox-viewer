
importScripts(
    "node_modules/geotiff/dist-browser/geotiff.js", 
    'node_modules/proj4/dist/proj4-src.js',
    './node_modules/geotiff-geokeys-to-proj4/main-dist.js'
);

let cogImage;
let abortUpdateRequest = false;

const colorTable = [
    [-7.0, '#08307B', 8, 48, 123],
    [-6.0, '#083C7F', 8, 60, 127],
    [-5.0, '#0A4984', 10, 73, 132],
    [-4.0, '#106388', 16, 99, 136],
    [-3.0, '#106287', 16, 98, 135],
    [-2.5, '#136E8C', 19, 110, 140],
    [-2.0, '#187C8C', 24, 124, 140],
    [-1.5, '#18888F', 24, 136, 143],
    [-1.0, '#1A9394', 26, 147, 148],
    [-0.5, '#219990', 33, 153, 144],
    [0.0, '#1D9F88', 29, 159, 136],
    [0.5, '#18A67F', 24, 166, 127],
    [1.0, '#18AE72', 24, 174, 114],
    [1.5, '#15B468', 21, 180, 104],
    [2.0, '#10BB5B', 16, 187, 91],
    [2.5, '#0CC14B', 12, 193, 75],
    [3.0, '#08CA3A', 16, 202, 58],
    [3.5, '#08CF31', 8, 207, 49],
    [4.0, '#03DB00', 3, 219, 0],
    [4.5, '#04DC00', 4, 220, 0],
    [5.0, '#1DE100', 29, 225, 0],
    [6.0, '#34E400', 52, 228, 0],
    [7.0, '#4CE800', 76, 232, 0],
    [8.0, '#88F100', 136, 241, 0],
    [9.0, '#84F000', 132, 240, 0],
    [10.0, '#A3F400', 163, 244, 0],
    [12.0, '#BFF700', 191, 247, 0],
    [14.0, '#D6F900', 214, 249, 0],
    [16.0, '#FFF600', 255, 246, 0],
    [18.0, '#FFED00', 255, 237, 0],
    [20.0, '#FBE000', 251, 224, 0],
    [25.0, '#FBDF00', 251, 223, 0],
    [30.0, '#F7D105', 247, 209, 8],
    [35.0, '#F7CB08', 247, 203, 8],
    [40.0, '#F7C208', 247, 194, 8],
    [45.0, '#F7B90C', 247, 185, 12],
    [50.0, '#F4B010', 244, 176, 16],
    [60.0, '#EFA410', 239, 164, 16],
    [70.0, '#EF9E10', 239, 158, 16],
    [80.0, '#E78B1A', 231, 139, 26],
    [90.0, '#E78B1A', 231, 139, 26],
    [100.0, '#E38021', 227, 128, 33],
    [125.0, '#D97225', 217, 114, 37],
    [150.0, '#D66A29', 214, 106, 41],
    [175.0, '#D2652C', 210, 101, 44],
    [200.0, '#CE5C31', 206, 92, 49],
    [250.0, '#CA5734', 202, 87, 52],
    [300.0, '#C65339', 198, 83, 57],
    [350.0, '#C65339', 198, 83, 57],
];

class MercatorCoordinate {
        x = 0;
        y = 0;
        constructor(x, y) {
            this.x = x;
            this.y = y;
        }
        toLngLat() {
            const y2 = 180 - this.y * 360;
            return {lng: this.x * 360 - 180, lat: 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90}
        }
}

function number(a, b, t) {
    return (a * (1 - t)) + (b * t);
}

function transformMat4(out, a, m) {
    var x = a[0],
        y = a[1],
        z = a[2],
        w = a[3];
    out[0] = m[0] * x + m[4] * y + m[8] * z + m[12] * w;
    out[1] = m[1] * x + m[5] * y + m[9] * z + m[13] * w;
    out[2] = m[2] * x + m[6] * y + m[10] * z + m[14] * w;
    out[3] = m[3] * x + m[7] * y + m[11] * z + m[15] * w;
    return out;
  }

const unproject = (p, pixelMatrixInverse, worldSize) => {
    const targetZ = 0;
    const coord0 = [p.x, p.y, 0, 1];
    const coord1 = [p.x, p.y, 1, 1];
    transformMat4(coord0, coord0, pixelMatrixInverse);
    transformMat4(coord1, coord1, pixelMatrixInverse);
    const w0 = coord0[3];
    const w1 = coord1[3];
    const x0 = coord0[0] / w0;
    const x1 = coord1[0] / w1;
    const y0 = coord0[1] / w0;
    const y1 = coord1[1] / w1;
    const z0 = coord0[2] / w0;
    const z1 = coord1[2] / w1;
    const t = z0 === z1 ? 0 : (targetZ - z0) / (z1 - z0);
    return new MercatorCoordinate(number(x0, x1, t) / worldSize, number(y0, y1, t) / worldSize).toLngLat();
}

const openCOG = async (url) => {
    const result = {images: []}
    // get the COG
    const tiff = result.tiff = await GeoTIFF.fromUrl(url);
    const mainImage = await tiff.getImage(0);
    result.images.push(mainImage);
    const geokeys = result.geokeys = mainImage.getGeoKeys();
    if (geokeys) {
        // get tiff data projection and
        // calculate south-west and north-east corners of the tiff image(s) in lat/lon
        let projObj = result.projObj = geokeysToProj4.toProj4(geokeys); // Convert geokeys to proj4 string
        console.log(projObj);
        const projection = result.projection = proj4(projObj.proj4, "WGS84"); // Project our GeoTIFF to WGS84
        const [xSize, ySize] = mainImage.getResolution(); // Get resolution of the image
        const [originX, originY] = mainImage.getOrigin(); // Get origin of the image
        const p1 = projection.forward([originX, originY]);
        const p2 = projection.forward([originX + xSize * mainImage.getWidth(), originY + ySize * mainImage.getHeight()]);
        const sw = [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1])];
        const ne = [Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])];
        result.bbox = [sw[0], sw[1], ne[0], ne[1]];
    }
    // get metadata for overlay images
    const imageCount = await tiff.getImageCount();
    for (let i = 1; i < imageCount; i++) {
        const image = await tiff.getImage(i);
        result.images.push(image);
    }
    console.log(result);
    return result;
}

let imageDataRequestCounter = 0;

const wait = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const getImageData = async (renderType, canvasbbox, w, h, pixelMatrixInverse, worldSize) => {
    imageDataRequestCounter++;
    const currentImageDataRequestCounter = imageDataRequestCounter;
    await wait(100);
    if (currentImageDataRequestCounter !== imageDataRequestCounter) {
        postMessage({cmd: 'getImageData', result: 'cancelled'});
        return;
    }
    if (cogImage) {
        const cogBbox = cogImage.bbox;
        if (cogBbox[0] <= canvasbbox[2] && cogBbox[2] > canvasbbox[0] && cogBbox[1] <= canvasbbox[3] && cogBbox[3] > canvasbbox[1]) {
            const imageData = new ImageData(w, h);
            const tiffImageSouthWest = cogImage.projection.inverse([canvasbbox[0], canvasbbox[1]]);
            const tiffImageNorthEast = cogImage.projection.inverse([canvasbbox[2], canvasbbox[3]]);
            const options = {
                bbox: [tiffImageSouthWest[0], tiffImageSouthWest[1], tiffImageNorthEast[0], tiffImageNorthEast[1]],
                width: w,
                height: h,
            }
            console.log('loading raster data');
            const data = await cogImage.tiff.readRasters(options);
            console.log('done loading raster data');
            if (currentImageDataRequestCounter !== imageDataRequestCounter) {
                postMessage({cmd: 'getImageData', result: 'cancelled'});
                return;
            }
            let minFloatValue = 100000000;
            let maxFloatValue = -100000000;
            for (let i = 0; i < data[0].length; i++) {
                const value = data[0][i];
                if (value > -10 && value < 323 && value !== 0) {
                    if (value < minFloatValue) {
                        minFloatValue = value;
                    }
                    if (value > maxFloatValue) {
                        maxFloatValue = value;
                    }
                }
            }
            const scale = (colorTable.length - 1) / (maxFloatValue - minFloatValue);
            const imgResX = (tiffImageNorthEast[0] - tiffImageSouthWest[0]) / data.width;
            const imgResY = (tiffImageNorthEast[1] - tiffImageSouthWest[1]) / data.height;
            // this is the slow part
            // for every longitude and latitude in the canvasbbox get the correspoding tiff value
            // the longitude and latitude of the cogImage pixels are not the same as the canvasbbox
            // so we need to get the tiff value for the corresponding pixel in the cogImage
            for (let x = 0; x < w; x++) {
                for (let y = 0; y < h; y++) {
                    const canvasLonLat = unproject({x:x, y:y}, pixelMatrixInverse, worldSize);
                    const tiffXY = cogImage.projection.inverse([canvasLonLat.lng, canvasLonLat.lat]);
                    const imageX = Math.round((tiffXY[0] - tiffImageSouthWest[0]) / imgResX);
                    const imageY = Math.round((tiffImageNorthEast[1] - tiffXY[1]) / imgResY);
                    if (imageX >= 0 && imageX < data.width && imageY >= 0 && imageY < data.height) {
                        const i = (imageY * data.width + imageX);
                        let floatValue = data[0][i];
                        const color = [0,0,0,0];
                        if (floatValue > -10 && floatValue < 323 && floatValue !== 0) {
                            switch (renderType) {
                                case 'dynamic':
                                    // dynamic color
                                    let c = Math.round((floatValue - minFloatValue) * scale);
                                    color[0] = colorTable[c][2];
                                    color[1] = colorTable[c][3];
                                    color[2] = colorTable[c][4];
                                    color[3] = 255;
                                    break;
                                case 'static':
                                    // color table
                                    for (let c = 0; c < colorTable.length; c++) {
                                        if (floatValue < colorTable[c][0]) {
                                            color[0] = colorTable[c][2];
                                            color[1] = colorTable[c][3];
                                            color[2] = colorTable[c][4];
                                            color[3] = 255;
                                            break;
                                        }
                                    }
                                    break;
                                case 'grayscale':
                                default:
                                    // gray scale
                                    const colorValue = Math.round((floatValue + 10) * 255 / 333);
                                    color[0] = colorValue;
                                    color[1] = colorValue;
                                    color[2] = colorValue;
                                    color[3] = 255;
                                    break;
                            }
                        }
                        const j = (y * w + x);
                        imageData.data[j * 4] = color[0];
                        imageData.data[j * 4 + 1] = color[1];
                        imageData.data[j * 4 + 2] = color[2];
                        imageData.data[j * 4 + 3] = color[3];
                    }
                }
            }
            await wait(1)
            if (currentImageDataRequestCounter === imageDataRequestCounter) {
                postMessage({cmd: 'getImageData', result: 'ok', imageData: imageData, canvasbbox: canvasbbox});
            } else {
                postMessage({cmd: 'getImageData', result: 'cancelled'});
            } 
        } else {
            postMessage({cmd: 'getImageData', result: 'no overlap'});
        }
    } else {
        postMessage({cmd: 'getImageData', result: 'no cogImage'});
    }
}

onmessage = async (e) => {
    switch(e.data.cmd) {
        case 'openCOG':
            cogImage = await openCOG(e.data.url);
            postMessage({cmd: 'openCOG', result: 'ok'})
            console.log(`worker opened COG ${e.data.url}`);
            break;
        case 'getImageData':
            console.log(`worker getImageData ${e.data.renderType} (${imageDataRequestCounter})`);
            getImageData(e.data.renderType, e.data.canvasbbox, e.data.width, e.data.height, e.data.pixelMatrixInverse, e.data.worldSize);
            break;
    }
}
