var map;
var storyHeight;

function init() {
    var story = document.querySelector('#story');
    storyHeight = story.clientHeight;
    story.onscroll = handleScroll;
    map = new mapboxgl.Map({
        container: 'map', // container id
        style: 'styles/openmaptiles/ktbasic.json', 
        center: [4.92, 52.374],
        bearing: 120,
        zoom: 11.5,
        minZoom: 5,
        maxBounds:[0,49,10,55]
    });

    map.on('load', function() {
        var rotation = 0;
        var pitch = 0;
        var pitchdirection = 0.25;
        var rotateMap = function () {
            rotation += 0.5;
            pitch += pitchdirection;
            if (pitch >= 60 && pitchdirection > 0) {
                pitchdirection = -pitchdirection
            } else if (pitch <= 0 && pitchdirection < 0) {
                pitchdirection = -pitchdirection;
            }
            if (rotation >= 360) {
                rotation = 0;
            }
            map.setBearing(rotation);
            map.setPitch(pitch);
            setTimeout(rotateMap, 25);
        }
        //rotateMap();  
        /*map.flyTo({
            center: map.center,
            bearing: 180,
            speed: 0.002,
            easing: function(t) { return t*0.9}
        })*/
    });
}

var chapters = {
    'intro': {
        style: 'styles/openmaptiles/ktbasic.json', 
        center: [4.92, 52.374],
        bearing: 120,
        zoom: 11.5,
        minZoom: 5,
        maxBounds:[0,49,10,55],
        pitch: 0
    },
    'setstyle': {
        style: 'styles/openmaptiles/positron.json', 
        center: [4.90, 52.374],
        bearing: 0,
        zoom: 8,
        minZoom: 5,
        maxBounds:[0,49,10,55],
        pitch: 0,
        setup: function() {
            document.querySelector('#menu').style.display = 'block'; // display menu            
            var styles = document.getElementById('menu').getElementsByTagName('input');
            function applyStyle(style) {
                var styleId = style.target.id;    
                map.setStyle('styles/openmaptiles/' + styleId + '.json');
            }
            for (var i = 0; i < styles.length; i++) {
                styles[i].onclick = applyStyle;
            }

        }
    },
    'data': {
        style: 'styles/openmaptiles/ktbasic.json', 
        center: [5.29969 , 51.69176],
        bearing: 0,
        zoom: 17.5,
        minZoom: 5,
        maxBounds:[0,49,10,55],
        pitch: 0, 
        setup: function() {
            map.on('mousemove', function (e) {
                var features = map.queryRenderedFeatures(e.point).map(function(feature){ return {layer: {id: feature.layer.id, type: feature.layer.type}, properties:(feature.properties)};});
                document.getElementById('info').innerHTML = formatInfo(features); //JSON.stringify(features, null, 2);
            });
        }
    }
};

function formatInfo(features) {
    // features is structured like: [{layer:{id:layername, type: line|fill|symbol}, properties: {key:value,key:value}}, ..]
    if (!features.length) {
        return "";
    }
    var result = "<table><tr><th>layer</th><th>properties</th></tr>";
    for (i = 0; i < features.length; i++) {
        result += "<tr><td>" + features[i].layer.id + "</td><td>";
        var first = true;
        for (key in features[i].properties) {
            if (first) {
                first = false;
            } else {
                result += ", ";
            }
            result += key + ":" + features[i].properties[key]
        }
        result += "</td></tr>";
    }
    result += "</table>";
    return result;
}

// On every scroll event, check which element is on screen
function handleScroll() {    
    var chapterNames = Object.keys(chapters);
    for (var i = 0; i < chapterNames.length; i++) {
        var chapterName = chapterNames[i];
        if (isElementOnScreen(chapterName)) {
            setActiveChapter(chapterName);
            break;
        }
    }
};

var activeChapterName = 'intro';
function setActiveChapter(chapterName) {
    if (chapterName === activeChapterName) return;

    if (chapters[activeChapterName].cleanup) {
        chapters[activeChapterName].cleanup();
    }
    if (chapters[chapterName].setup) {
        chapters[chapterName].setup();
    }
    map.setStyle(chapters[chapterName].style);
    map.flyTo(chapters[chapterName]);

    document.getElementById(chapterName).setAttribute('class', 'active');
    document.getElementById(activeChapterName).setAttribute('class', '');

    activeChapterName = chapterName;
}

function isElementOnScreen(id) {    
    var element = document.getElementById(id);
    return ((element.offsetTop + element.offsetHeight - 100) > document.getElementById('story').scrollTop);
}
