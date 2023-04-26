let map;
const myWorker = new Worker("cogdynahnworker.js");
myWorker.onmessage = (e) => {
    if (e.data.cmd && e.data.result) {
        console.log(`worker cmd: ${e.data.cmd}, result: ${e.data.result}`);
        switch (e.data.cmd) {
            case 'openCOG':
                if (e.data.result === 'ok') {
                    updateCanvasLayer();
                }
                break;
            case 'getImageData':
                if (e.data.result === 'ok') {
                    renderCanvas(e.data.imageData, e.data.canvasbbox);
                }
                break;
            default:
                console.log(`unknown worker cmd: ${e.data.cmd}`);
        }
    }
}

const renderCanvas = (imageData, canvasbbox) => {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const sw = {lng: canvasbbox[0], lat: canvasbbox[1]};
    const ne = {lng: canvasbbox[2], lat: canvasbbox[3]};
    ctx.putImageData(imageData, 0, 0);
    const prevCanvasLayer = map.getLayer('canvas-layer');
    if (prevCanvasLayer) {
        map.removeLayer('canvas-layer');
    }
    const prevCanvasSource = map.getSource('canvas-layer');
    if (prevCanvasSource) {
        map.removeSource('canvas-layer');
    }
    map.addLayer({
        id: 'canvas-layer',
        type: 'raster',
        source: {
            'type': 'canvas',
            'canvas': 'canvas',
            coordinates: [
                [sw.lng, ne.lat],
                [ne.lng, ne.lat],
                [ne.lng, sw.lat],
                [sw.lng, sw.lat]
            ],
            animate: false
        }
    })
}

const updateCanvasLayer = async () => {
    const bounds = map.getBounds();
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const canvas = document.getElementById('canvas');
    const w = canvas.width = canvas.clientWidth;
    const h = canvas.height = canvas.clientHeight;
    const canvasbbox = [sw.lng, sw.lat, ne.lng, ne.lat];
    const renderType = document.querySelector('#typeselect select').value;
    myWorker.postMessage({ cmd: 'getImageData', renderType, canvasbbox, width: w, height: h, pixelMatrixInverse: map.transform.pixelMatrixInverse, worldSize: map.transform.worldSize});
}

map = new maplibregl.Map({
    container: 'map', // container id
    style: {
        "version": 8,
        "sources": {
            "raster-tiles": {
                "type": "raster",
                "tiles": [
			"https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
			"https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
            "https://c.tile.openstreetmap.org/{z}/{x}/{y}.png"
			],
                "tileSize": 256,
                "attribution": "© OpenStreetMap contributors",
                "maxzoom": 19
            }
        },
        "layers": [{
            "id": "simple-tiles",
            "type": "raster",
            "source": "raster-tiles",
            "minzoom": 0
        }]
    },
    center: [5, 52], // starting position
    zoom: 7 // starting zoom
});
map.on('load', async ()=> {
    map.addLayer({
        'id': 'tiles',
        'type': 'fill',
        'source': {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        },
        'paint': {
            'fill-opacity': 0.15,
            'fill-color': '#088',
            'fill-outline-color': '#000'
        }
    });
    myWorker.postMessage({cmd: 'openCOG', url: "https://ahp-research.storage.googleapis.com/rasters/ahn4_05m_dtm_cog.tiff"});
    //myWorker.postMessage({cmd: 'openCOG', url: "https://storage.googleapis.com/ahp-research/rasters/ahn3_5m.tiff"});
});

map.on('moveend', () => {
    updateCanvasLayer();
})

document.querySelector('#typeselect select').addEventListener('change', () => {
    updateCanvasLayer();
});