var map;
var storyHeight;

function init() {
    shrinkForScrollbarWidth();
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

var hilitebuilding = function(e) {
  map.setFilter("buildingshover", ["==", "gebwbagid", e.features[0].properties.gebwbagid]);
};

var unhilitebuilding = function() {
  map.setFilter("buildingshover", ["==", "gebwbagid", ""]);
};

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
    },
    'postgismvt': {
        style: 'styles/freetilehosting/positron.json',
        center: [4.9132, 52.34227],
        bearing: 0,
        zoom: 12,
        minZoom: 0,
        maxBounds:[-180,-90,180,90],
        pitch: 0,
        setup: function() {
            var loaded = false;
            map.on('styledata', function() {
                if (!loaded) {
                    loaded = true;
                    addRailLayers(map);
                }
            });
            document.querySelector('#menu').style.display='none';
        }
    },
    'geodanmaps': {
        style: 'styles/bagagnadressen.json',
        center: [4.9132, 52.34227],
        bearing: 0,
        zoom: 18,
        minZoom: 0,
        maxBounds:[-180,-90,180,90],
        pitch: 0,
        setup: function() {
            map.on("mousemove", "buildings", hilitebuilding);
  
            // Reset the buildingshover layer's filter when the mouse leaves the layer.
            map.on("mouseleave", "buildings", unhilitebuilding);
        },
        cleanup: function() {
          map.off("mousemove", "buildings", hilitebuilding);
          map.off("mouseleave", "buildings", unhilitebuilding);
        }
    }
};

function formatInfo(features) {
    // features is structured like: [{layer:{id:layername, type: line|fill|symbol}, properties: {key:value,key:value}}, ..]
    if (!features.length) {
        return "";
    }
    var result = '<table border="1"><thead><tr><th>stijllaag</th><th>feature eigenschappen</th></tr></thead>';
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
    map.setStyle(chapters[chapterName].style);
    map.setMinZoom(chapters[chapterName].minZoom);
    map.setMaxBounds(chapters[chapterName].maxBounds);
    if (chapters[chapterName].setup) {
        chapters[chapterName].setup();
    }
    map.flyTo(chapters[chapterName]);

    document.getElementById(chapterName).setAttribute('class', 'active');
    document.getElementById(activeChapterName).setAttribute('class', '');

    activeChapterName = chapterName;
}

function isElementOnScreen(id) {
    var element = document.getElementById(id);
    return ((element.offsetTop + element.offsetHeight - 100) > document.getElementById('story').scrollTop);
}


function addRailLayers(map)
{
    map.addSource("rail", {
            type: 'vector',
            tiles:["http://saturnus.geodan.nl/mvt/rail/{z}/{x}/{y}.mvt"]
        });

    map.addLayer({
      "id": "rail",
      "type": "line",
      "source": "rail",
      "source-layer": "rail",
      "minzoom": 12,
      "maxzoom": 24,
      "filter": [
        "none",
        [
          "==",
          "railway",
          "tram"
        ],
        [
          "==",
          "railway",
          "abandoned"
        ]
      ],
      "layout": {
        "visibility": "visible"
      }
    }, 'place_other');
    map.addLayer({
      "id": "rail-route",
      "type": "line",
      "source": "rail",
      "source-layer": "rail",
      "minzoom": 5,
      "maxzoom": 11.9999,
      "filter": [
        "all",
        [
          "in",
          "route",
          "railway", "train"
        ],
        [
          "!=",
          "railway",
          "abandoned"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgba(179, 141, 39, 1)",
        "line-width": 3
      }
    }, 'place_other');
    map.addLayer({
      "id": "tram",
      "type": "line",
      "source": "rail",
      "source-layer": "rail",
      "minzoom": 12,
      "filter": [
        "any",
        [
          "==",
          "railway",
          "tram"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgba(103, 45, 45, 1)"
      }
    }, 'place_other');
    map.addLayer({
      "id": "subway",
      "type": "line",
      "source": "rail",
      "source-layer": "rail",
      "minzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "railway",
          "subway"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgba(143, 96, 144, 1)",
        "line-width": 1,
        "line-gap-width": 1
      }
    }, 'place_other');
    map.addLayer({
      "id": "lightrail",
      "type": "line",
      "source": "rail",
      "source-layer": "rail",
      "minzoom": 12,
      "filter": [
        "all",
        [
          "==",
          "railway",
          "light_rail"
        ]
      ],
      "layout": {
        "visibility": "visible"
      },
      "paint": {
        "line-color": "rgba(143, 96, 144, 1)",
        "line-width": 1
      }
    });
}

function shrinkForScrollbarWidth()
{
  // Create the measurement node
  var scrollDiv = document.createElement("div");
  scrollDiv.className = "scrollbar-measure";
  document.body.appendChild(scrollDiv);

  // Get the scrollbar width
  var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;

  // Delete the DIV
  document.body.removeChild(scrollDiv);


  var story = document.querySelector('#story');
  story.style.width=(story.offsetWidth - scrollbarWidth)+'px';
}

