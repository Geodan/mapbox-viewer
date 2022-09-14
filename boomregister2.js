let boomkroon = true;
let map = new mapboxgl.Map({
    container: 'map',
    zoom: 16,
    maxZoom: 18.99,
    center: [4.913, 52.342],
    pitch: 60,
    style: {
        "version": 8,
        "sources": {
            "raster-tiles": {
                "type": "raster",
                "tiles": [
			        "https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/2021_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg"
			    ],
                "tileSize": 256,
                "attribution": '<a href="https://pdok.nl" target="_pdok">pdok.nl</a>'
            }
        },
        "layers": [{
            "id": "lufo2021",
            "type": "raster",
            "source": "raster-tiles",
            "minzoom": 0,
            "maxzoom": 22
        }]
    },
});
map.addControl(new mapboxgl.NavigationControl({showCompass:true, showZoom: true, visualizePitch: true}), "bottom-left");

let currentFeature, clickedFeature;
//window.localStorage.clear();
let deletedFeatures = window.localStorage.getItem('deletedFeatures');
let updatedBoomkronen = window.localStorage.getItem('updatedBoomkronen'); // props + crown geometries
let updatedBoomstammen = window.localStorage.getItem('updatedBoomstammen'); // props + stem geometries
let usermail = window.localStorage.getItem('useremail');

deletedFeatures = deletedFeatures ? JSON.parse(deletedFeatures) : [];
updatedBoomkronen = updatedBoomkronen ? JSON.parse(updatedBoomkronen) : [];
updatedBoomstammen = updatedBoomstammen ? JSON.parse(updatedBoomstammen) : [];

let deleteCount = 0;
let updateCount = 0;
function updateMap(force) {
    if (deletedFeatures.length !== deleteCount) {
        deleteCount = deletedFeatures.length;
        let deleteFilter = ["!", ["in", ["id"], ["literal", deletedFeatures.map(feature=>feature.id)]]];
        map.setFilter('boomkroon', deleteFilter);
        map.setFilter('boomstam', deleteFilter);
        map.setFilter('boompunt', deleteFilter);
    }
    if (updatedBoomstammen.length !== updateCount || force) {
        updateCount = updatedBoomstammen.length;
        map.getSource('boomkroonupdates').setData({type:'FeatureCollection',features:updatedBoomkronen});
        map.getSource('boomstamupdates').setData({type:'FeatureCollection',features:updatedBoomstammen});
    }
}

function deleteVectorFeature(feature) {
    console.log(feature);
    if (feature.source == "boomregister") {
        deletedFeatures.push({id:feature.id,entrydate:Date.now()});
        map.setFeatureState(feature, {clicked: false});
        window.localStorage.setItem('deletedFeatures', JSON.stringify(deletedFeatures));
    } else if (feature.source == "boomkroonupdates") {
        updatedBoomkronen = updatedBoomkronen.filter(boomkroon=>boomkroon.id != feature.id);
        updatedBoomstammen = updatedBoomstammen.filter(boomstam=>boomstam.id != feature.id);
        window.localStorage.setItem('updatedBoomkronen', JSON.stringify(updatedBoomkronen));
        window.localStorage.setItem('updatedBoomstammen', JSON.stringify(updatedBoomstammen));
    }
}

function updateProperty(inputElement) {
    if (clickedFeature) {
        let requestMapUpdate = false;
        let updateBoomkroon = updatedBoomkronen.find(feature=>feature.id==clickedFeature.id);
        let updateBoomstam = updatedBoomstammen.find(feature=>feature.id==clickedFeature.id);
        if (!updateBoomkroon || !updateBoomstam) {
            // first update for this tree
            let boomkroon = map.queryRenderedFeatures({layers:['boomkroon'],filter:["==",["get","boomid"],clickedFeature.id]});
            let boomstam = map.queryRenderedFeatures({layers:['boomstam'],filter:["==",["get","boomid"],clickedFeature.id]});
            if (boomkroon.length && boomstam.length) {
                updateBoomkroon = {type:"Feature", "id": clickedFeature.id, properties: boomkroon[0].properties, geometry: boomkroon[0].geometry};
                updateBoomstam = {type:"Feature", "id": clickedFeature.id, properties: boomkroon[0].properties, geometry: boomstam[0].geometry};
                updatedBoomkronen.push(updateBoomkroon);
                updatedBoomstammen.push(updateBoomstam);
                map.setFeatureState(clickedFeature, {clicked: false});
                deleteVectorFeature(clickedFeature);
                delete clickedFeature.sourceLayer;
                clickedFeature.source = 'boomkroonupdates';
                requestMapUpdate = true;
            }
        }
        if (updateBoomkroon && updateBoomstam) {
            if (typeof updateBoomkroon.properties[inputElement.name] === "number") {
                updateBoomkroon.properties[inputElement.name] = updateBoomstam.properties[inputElement.name] = parseFloat(inputElement.value.replace(',', '.'));
            } else {
                updateBoomkroon.properties[inputElement.name] = updateBoomstam.properties[inputElement.name] = inputElement.value;
            }
            updateBoomkroon.properties.entrydate = updateBoomstam.properties.entrydate = Date.now();
            map.setFeatureState(clickedFeature, {clicked: true});
            window.localStorage.setItem('updatedBoomkronen', JSON.stringify(updatedBoomkronen));
            window.localStorage.setItem('updatedBoomstammen', JSON.stringify(updatedBoomstammen));
        }
        updateMap(true);
    }
}

function resetMap()
{
    deletedFeatures = [];
    updatedBoomkronen = [];
    updatedBoomstammen = [];
    window.localStorage.setItem('deletedFeatures', JSON.stringify(deletedFeatures));
    window.localStorage.setItem('updatedBoomkronen', JSON.stringify(updatedBoomkronen));
    window.localStorage.setItem('updatedBoomstammen', JSON.stringify(updatedBoomstammen));
    
    deletecount = -1;
    updateMap(true);
}

function dialogClose() {
    document.querySelector('#dialog').classList.add('hidden');
}

function dialogSaveShow() {
    const spanNewTrees = document.querySelector('#newtrees');
    const spanUpdatedTrees = document.querySelector('#updatedtrees');
    const spanDeletedTrees = document.querySelector('#deletedtrees');

    spanNewTrees.innerHTML = `${updatedBoomkronen.filter(boomkroon=>boomkroon.id < 0).length}`;
    spanUpdatedTrees.innerHTML = `${updatedBoomkronen.filter(boomkroon=>boomkroon.id >= 0).length}`;
    spanDeletedTrees.innerHTML = `${deletedFeatures.length - updatedBoomkronen.length}`;

    if (usermail) {
        const emailInput = document.querySelector('#email');
        emailInput.value = usermail;
    }

    document.querySelector('#dialog').classList.remove('hidden');

    if (deletedFeatures.length === 0 && updatedBoomkronen.length === 0) {
        dialogErrorMessage('#dialognochanges', true);
        setTimeout(()=>{
            dialogClose();
            dialogErrorMessage('#dialognochanges', false);
        }, 3000)
    }
}

function dialogPrivacyCheckbox() {
    const privacyCheckbox = document.querySelector('#akkoord');
    const sendButton = document.querySelector('#sendbutton');
    if (privacyCheckbox.checked) {
        sendButton.classList.remove('disabled');
    } else {
        sendButton.classList.add('disabled');
    }
}

function getFingerPrint() {
    // Create a new ClientJS object
    const client = new ClientJS();

    // Get the client's fingerprint id
    const fingerprint = client.getFingerprint();
    return fingerprint;
}

async function uploadUpdates() {
    let result = {
        deletes: [],
        updates: []
    }
    //const url = 'http://localhost:3030/updatetrees';
    const url = 'https://saturnus.geodan.nl/boomregisterservice/updatetrees'
    const fingerprint = getFingerPrint();
    const usermail = document.querySelector('#email').value;
    const undeletedTrees = updatedBoomkronen.map(boom=>boom.properties.boomid);
    const treeUpdates = {
        updates: updatedBoomkronen.map(boom=>{
            return {
                usermail: usermail,
                fingerprint: fingerprint,
                entrydate: boom.properties.entrydate,
                tree_id: boom.properties.boomid.toString(),
                height: boom.properties.hoogte,
                manform: boom.properties.manform,
                cultivar: boom.properties.cultivar,
                species: boom.properties.species,
                genus: boom.properties.genus,
                family: boom.properties.family,
                base: boom.properties.base,
                cr_area: boom.properties.cr_area,
                cr_diam: boom.properties.cr_diam
            }
        }),
        deletes: deletedFeatures.filter(boom=>!undeletedTrees.includes(boom.id)).map(boom=>{
            return {
                usermail: usermail,
                fingerprint: fingerprint,
                entrydate: boom.entrydate,
                tree_id: boom.id.toString()
            }
        })
    }
    const response = await fetch(url, {
        "method": "POST",
        "headers": {
            "Content-Type": "application/json"
        },
        "body": JSON.stringify(treeUpdates)
    });
    if (response.ok) {
        result = await response.json();
        console.log(result);
    } else {
        console.log(`failed to send data`);
    }
    return result;
}

function dialogErrorMessage(id, visible)
{
    const dialogErrorElement = document.querySelector(id);
    if (visible) {
        dialogErrorElement.classList.remove('hidden');
    } else {
        dialogErrorElement.classList.add('hidden');
    }
}

async function uploadButtonClick() {
    const usermail = document.querySelector('#email').value;
    window.localStorage.setItem('useremail', usermail);
    const result = await uploadUpdates();
    if (result.deletes.length || result.updates.length) {
        dialogClose();
        resetMap();
        const boomkroon = map.getLayer('boomkroon').serialize();
        const boomstam = map.getLayer('boomstam').serialize();
        const boompunt = map.getLayer('boompunt').serialize();
        delete boomkroon.filter;
        delete boomstam.filter;
        delete boompunt.filter;
        map.removeLayer('boomkroon');
        map.removeLayer('boomstam');
        map.removeLayer('boompunt');
        setTimeout(()=> {
            map.addLayer(boompunt, 'boompuntupdates');
            map.addLayer(boomstam, 'boompuntupdates');
            map.addLayer(boomkroon, 'boompuntupdates')
        }, 500);
    } else {
        dialogErrorMessage('#dialogerror', true);
        setTimeout(()=>{
            dialogClose();
            dialogErrorMessage('#dialogerror', false);
        }, 10000);
    }
}

function saveMap() {
    dialogSaveShow()
}

function addLayers() {
    map.addSource("boomregister", {
        promoteId: 'boomid',
        type: 'vector',
        tiles:["https://saturnus.geodan.nl/mvt/pgsql2mvt/boomregister2022/{z}/{x}/{y}.mvt"],
        bounds:[3.35869016315027,50.750546749596,7.22751067314304,53.5153564304624],
        maxzoom: 19,
        attribution: '<a href="http://boomregister.nl" target="boomregister">boomregister.nl</a>'
    });
    map.addSource("boomregisterupdates", {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    })
    map.addSource("boomstamupdates", {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });
    map.addSource("boomkroonupdates", {
        type: 'geojson',
        data: {
            type: 'FeatureCollection',
            features: []
        }
    });
    map.addLayer({
        id: "boompunt",
        "minzoom": 13,
        "maxzoom": 22, // 15
        "type": "circle",
        "source": "boomregister",
        "source-layer": "boompunt",
        "paint":  {
            "circle-color":[
                "case",["<",["get","hoogte"],5.6],"#ffffcc",
                ["<",["get","hoogte"],9.53],"#d9f0a3",
                ["<",["get","hoogte"],13.04],"#addd8e",
                ["<",["get","hoogte"],15.83],"#78c679",
                ["<",["get","hoogte"],18.25],"#41ab5d",
                ["<",["get","hoogte"],21.37],"#238443",
                ["<=",["get","hoogte"],48],"#005a32",
                "#005a32"
            ],
            "circle-stroke-color":"white",
            "circle-opacity":0.8,
            "circle-radius":[
                "case",["<",["get","hoogte"],5.6],2,
                ["<",["get","hoogte"],9.53],3,
                ["<",["get","hoogte"],13.04],4,
                ["<",["get","hoogte"],15.83],5,
                ["<",["get","hoogte"],18.25],6,
                ["<",["get","hoogte"],21.37],7,
                ["<=",["get","hoogte"],48],8,
                0
            ],
            "circle-pitch-alignment": "map"
        }
    });
    map.addLayer({
        id: "boomstam",
        "minzoom": 15,
        "maxzoom": 22,
        "type": "fill-extrusion",
        "source": "boomregister",
        "source-layer": "boomstam",
        "paint": {
            "fill-extrusion-color": ["case", 
                ["boolean", ["feature-state", "hover"], false], "orange", 
                ["boolean", ["feature-state", "clicked"], false], "red",
                "brown"],
            "fill-extrusion-height": ["*",0.5,["get", "hoogte"]],
            "fill-extrusion-opacity": 0.8
        }
    });
    map.addLayer({
        id: "boomkroon",
        "minzoom": 15,
        "maxzoom": 22,
        "type": "fill-extrusion",
        "source": "boomregister",
        "source-layer": "boomkroon",
        "paint": {
            "fill-extrusion-color":[
                "case",
                ["boolean", ["feature-state", "clicked"], false], "red",
                ["boolean", ["feature-state", "hover"], false], "orange",
                ["<",["get","hoogte"],5.6],"#ffffcc",
                ["<",["get","hoogte"],9.53],"#d9f0a3",
                ["<",["get","hoogte"],13.04],"#addd8e",
                ["<",["get","hoogte"],15.83],"#78c679",
                ["<",["get","hoogte"],18.25],"#41ab5d",
                ["<",["get","hoogte"],21.37],"#238443",
                ["<=",["get","hoogte"],48],"#005a32",
                "#005a32"],
            "fill-extrusion-height": ["get", "hoogte"],
            "fill-extrusion-base" : ["*",0.5, ["get", "hoogte"]],
            "fill-extrusion-opacity": 0.95
        }
    });
    map.addLayer({
        id: "boompuntupdates",
        "minzoom": 15,
        "maxzoom": 22,
        "type": "circle", 
        "source": "boomregisterupdates",
        "paint": {
            "circle-color":[
                "case",["<",["get","hoogte"],5.6],"#ffffcc",
                ["<",["get","hoogte"],9.53],"#d9f0a3",
                ["<",["get","hoogte"],13.04],"#addd8e",
                ["<",["get","hoogte"],15.83],"#78c679",
                ["<",["get","hoogte"],18.25],"#41ab5d",
                ["<",["get","hoogte"],21.37],"#238443",
                ["<=",["get","hoogte"],48],"#005a32",
                "#005a32"
            ],
            "circle-stroke-color":"white",
            "circle-opacity":0.8,
            "circle-radius":[
                "case",["<",["get","hoogte"],5.6],2,
                ["<",["get","hoogte"],9.53],3,
                ["<",["get","hoogte"],13.04],4,
                ["<",["get","hoogte"],15.83],5,
                ["<",["get","hoogte"],18.25],6,
                ["<",["get","hoogte"],21.37],7,
                ["<=",["get","hoogte"],48],8,
                0
            ],
            "circle-pitch-alignment": "map"
        }
    })
    map.addLayer({
        id: "boomkroonupdates",
        "minzoom": 15,
        "maxzoom": 22,
        "type": "fill-extrusion",
        "source": "boomkroonupdates",
        "paint": {
            "fill-extrusion-color":[
                "case",
                ["boolean", ["feature-state", "clicked"], false], "red",
                ["boolean", ["feature-state", "hover"], false], "orange",
                ["<",["get","hoogte"],5.6],"#ffffcc",
                ["<",["get","hoogte"],9.53],"#d9f0a3",
                ["<",["get","hoogte"],13.04],"#addd8e",
                ["<",["get","hoogte"],15.83],"#78c679",
                ["<",["get","hoogte"],18.25],"#41ab5d",
                ["<",["get","hoogte"],21.37],"#238443",
                ["<=",["get","hoogte"],48],"#005a32",
                "#005a32"],
            "fill-extrusion-height": ["get", "hoogte"],
            "fill-extrusion-base" : ["*",0.5, ["get", "hoogte"]],
            "fill-extrusion-opacity": 0.95
        }
    });
    map.addLayer({
        id: "boomstamupdates",
        "minzoom": 15,
        "maxzoom": 22,
        "type": "fill-extrusion",
        "source": "boomstamupdates",
        "paint": {
            "fill-extrusion-color": ["case", 
                ["boolean", ["feature-state", "hover"], false], "orange", 
                ["boolean", ["feature-state", "clicked"], false], "red",
                "brown"],
            "fill-extrusion-height": ["*",0.5,["get", "hoogte"]],
            "fill-extrusion-opacity": 0.8
        }
    });
}

map.on('load', function () {
    //map.showTileBoundaries = true;
    addLayers();
    updateMap();
    map.on("mousemove", event=>{        
        let features = map.queryRenderedFeatures(event.point);
        if (features.length) {
            if (currentFeature && currentFeature.id === features[0].id && currentFeature.source === features[0].source && currentFeature.sourceLayer === features[0].sourceLayer) {
                // same feature selected
                return;
            }
            if (currentFeature) {
                map.setFeatureState(currentFeature, {hover: false});
            }
            let newFeature = {source: features[0].source, sourceLayer: features[0].sourceLayer, id: features[0].id};
            map.setFeatureState(newFeature, {hover: true});
            let info = `<span class="label">layer:</span> ${features[0].layer.id}<br>`;
            switch(features[0].layer.id) {
                case "boomkroon":
                case "boomkroonupdates":
                case "boompunt":
                    info += `<span class="label">boom id:</span> ${features[0].properties.boomid}<br>\n
                        <span class="label">hoogte:</span> ${features[0].properties.hoogte}<br>\n
                        <span class="label">manform:</span> ${features[0].properties.manform}<br>\n
                        <span class="label">cultivar:</span> ${features[0].properties.cultivar}<br>\n
                        <span class="label">soort:</span> ${features[0].properties.species}<br>\n
                        <span class="label">geslacht:</span> ${features[0].properties.genus}<br>\n
                        <span class="label">familie:</span> ${features[0].properties.family}<br>\n
                        <span class="label">base:</span> ${features[0].properties.base}<br>\n
                        <span class="label">oppervlak:</span> ${features[0].properties.cr_area}<br>\n
                        <span class="label">diameter:</span> ${features[0].properties.cr_diam}<br>\n
                        <span class="label">ug_cover:</span> ${features[0].properties.ug_cover}<br>\n
                        `;
                    break;
                default: 
                    ;
            }
            document.querySelector('#infobox').innerHTML = info;
            currentFeature = newFeature;
        } else {
            if (currentFeature) {
                map.setFeatureState(currentFeature, {hover: false});
                currentFeature = null;
                document.querySelector('#infobox').innerHTML = '';
            }
        }
    });
    map.on("click", event=>{        
        let features = map.queryRenderedFeatures(event.point);
        if (features.length) {
            if (clickedFeature && clickedFeature.id === features[0].id && clickedFeature.source === features[0].source && clickedFeature.sourceLayer === features[0].sourceLayer) {
                // same feature clicked
                return;
            }
            if (clickedFeature) {
                map.setFeatureState(clickedFeature, {clicked: false});
            }
            let newFeature= {id: features[0].id, source: features[0].source, sourceLayer: features[0].sourceLayer}
            map.setFeatureState(newFeature, {clicked: true});
            let info = ``;
            switch(features[0].layer.id) {
                case "boomkroon":
                case "boomkroonupdates":
                case "boomstam":
                    info += `<span class="label">boom id:</span> ${features[0].properties.boomid}<br>\n
                        <table>
                        <tr><td><label for="hoogte">Hoogte:</label></td><td><input type="number" id="hoogte" name="hoogte" value="${features[0].properties.hoogte}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="manform">Manform:</label></td><td><input type="text" id="manform" name="manform" value="${features[0].properties.manform}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="cultivar">Cultivar:</label></td><td><input type="text" id="cultivar" name="cultivar" value="${features[0].properties.cultivar}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="species">Soort:</label></td><td><input type="text" id="species" name="species" value="${features[0].properties.species}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="genus">Geslacht:</label></td><td><input type="text" id="genus" name="genus" value="${features[0].properties.genus}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="family">Familie:</label></td><td><input type="text" id="family" name="family" value="${features[0].properties.family}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="base">Base:</label></td><td><input type="text" id="base" name="base" value="${features[0].properties.base}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="cr_area">Oppervlak:</label></td><td><input type="number" disabled id="cr_area" name="cr_area" value="${features[0].properties.cr_area}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="cr_diam">Diameter:</label></td><td><input type="number" disabled id="cr_diam" name="cr_diam" value="${features[0].properties.cr_diam}" oninput="updateProperty(this)"></td></tr>\n
                        <tr><td><label for="ug_cover">UG_cover:</label></td><td><input type="number" disabled id="ug_cover" name="ug_cover" value="${features[0].properties.ug_cover}" oninput="updateProperty(this)"></td></tr>\n
                        </table>`;
                    break;
                default: 
                    info += `<span class="label">cannot edit layer:</span> ${features[0].layer.id}`;
            }
            document.querySelector('#editbox').innerHTML = info;
            clickedFeature = newFeature;
        } else {
            if (clickedFeature) {
                map.setFeatureState(clickedFeature, {clicked: false});
                clickedFeature = null;
                document.querySelector('#editbox').innerHTML = '';
            }
        }
    });
    const backgroundlayers = [
        {value: "2016", url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/2016_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg'},
        {value: "2017", url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/2017_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg'},
        {value: "2018", url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/2018_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg'},
        {value: "2019", url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/2019_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg'},
        {value: "2020", url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/2020_ortho25/EPSG:3857/{z}/{x}/{y}.jpeg"'},
        {value: "2021", url: 'https://service.pdok.nl/hwh/luchtfotorgb/wmts/v1_0/2021_orthoHR/EPSG:3857/{z}/{x}/{y}.jpeg'},
        {value: "ahn3", tileSize: 512, url: 'https://t3.edugis.nl/mapproxy/ahn3/service?=WMS&REQUEST=GETMAP&SERVICE=WMS&VERSION=1.1.1&TRANSPARENT=true&LAYERS=ahn3_dsm&FORMAT=image%2Fpng&STYLES=&SRS=EPSG%3A3857&BBOX={bbox-epsg-3857}&WIDTH=512&HEIGHT=512'}
    ];
    let prevValue = `lufo2021`;
    document.querySelector('#map').addEventListener('keydown', (event)=>{
        if (event.key === "Backspace" || event.key === "Delete") {
            if (clickedFeature) {
                deleteVectorFeature(clickedFeature);
                updateMap();
                clickedFeature = null;
                document.querySelector('#editbox').innerHTML = '';
            }
        }
    });
    document.querySelectorAll('input[name="achtergrond"]').forEach(radio=>{
        radio.onclick = (e)=>{
            if (e.target.value !== prevValue) {
                const layerInfo = backgroundlayers.find(layer=>layer.value===e.target.value);
                const layer = {id: `${e.target.value}`, type: "raster", source: {type:"raster", tiles: [layerInfo.url], tileSize: layerInfo.tileSize? layerInfo.tileSize : 256, attribution: '<a href="https://pdok.nl" target="_pdok">pdok.nl</a>'}};
                map.addLayer(layer, prevValue)
                if (map.getLayer(prevValue)){
                    map.removeLayer(prevValue);
                }
                if (map.getSource(prevValue)) {
                    map.removeSource(prevValue);
                }
                prevValue = layer.id;
            }
        }
    })
    document.querySelectorAll('input[name="boomregister"]').forEach(radio=>{
        radio.onclick = (e) => {
            if (e.target.value === "boomkroon") {
                toggleBoomkroon(true);
            } else {
                toggleBoomkroon(false);
            }
        }
    });
    map.on("zoomend", (e) => {
        if (map.getZoom(e) < 15) {
            map.setLayoutProperty("boompunt", "visibility", "visible");
        } else if (boomkroon) {
            map.setLayoutProperty("boompunt", "visibility", "none");
        }
    })
});
function toggleBoomkroon(visible) {
    boomkroon = visible;
    if (boomkroon) {
        map.setLayoutProperty("boomkroon", "visibility", "visible");
        map.setLayoutProperty("boomstam", "visibility", "visible");
        if (map.getZoom() > 15) {
            map.setLayoutProperty("boompunt", "visibility", "none");
        }
    } else {
        map.setLayoutProperty("boomkroon", "visibility", "none");
        map.setLayoutProperty("boomstam", "visibility", "none");
        map.setLayoutProperty("boompunt", "visibility", "visible")
    }
}