import { LitElement, html, css } from 'lit-element';

import { SharedStyles } from '../../../styles/shared-styles';

/**
* @polymer
* @extends HTMLElement
*/
class ViewTransportMap extends LitElement {
  static get properties() {
    return {
    };
  }

  constructor() {
    super();
  }

  static get styles() {
    return [
      css`
        ${SharedStyles}

        :host {
            height: 100%;
            width: 100%;
        }

        #map {
          height: 100%;
          width: 100%;   
          position:relative;
          overflow: hidden;         
          z-index: 1;
        }
      `
    ];
  }

  render() {
    return html`
      <div id='map'>
      </div>
    `;
  }

  firstUpdated() {
    mapboxgl.accessToken = 'pk.eyJ1IjoidGlsdCIsImEiOiJjaXl5dnAydjYwMDAxMnFwYWR1Z2ZjMngwIn0.JYt8pUcgFf9QETgo5FzA0A';
    this.map = window.map = new mapboxgl.Map({
      container: this.shadowRoot.querySelector('#map'),
      style: 'mapbox://styles/mapbox/dark-v9',
      center: [4.94430963, 52.28946918],
      zoom: 15.3,
      pitch: 58,
      bearing: 25
    });
    
    this.map.on('load', (e)=>this._mapLoaded(e));
  }
  _loadLianderStoringen() {
    fetch('https://services1.arcgis.com/v6W5HAVrpgSg3vts/ArcGIS/rest/services/IStoringen_Productie_V7/FeatureServer/0/query?where=STORING_STATUS+not+like+%27opgelost%27+AND+STORING_DATUM_GEMELD+%3E%3D+%275-23-2018%27&outFields=*&returnGeometry=true&f=geojson&OUTSR=4326').then(result=>{
        if (!result.ok) {

        } else {
            result.json().then(json=>{
                this.map.getSource('liander_storingen').setData(json);
            })
        }
    })
    setTimeout(()=>this._loadLianderStoringen(), 50000);
  }
  
  _loadOv() {
      if (!this.loadCounter) {
        this.loadCounter = 1;
      } else {
        this.loadCounter++;
      }
      //fetch('https://saturnus.geodan.nl/ovpositions/trips').then(result=>{
      fetch('https://saturnus.geodan.nl/ovinfo/api/Positions/Live').then(result=>{
        if (!result.ok) {

        } else {
            result.json().then(json=>{
                if (!json.features) {
                  json.features = [];
                }
                for (let feature of json.features) {
                  let mappedFeature = this.datasetMap.get(feature.properties.realtimeTripId);
                  if (!mappedFeature) {
                    mappedFeature = JSON.parse(JSON.stringify(feature));
                    mappedFeature.geometry = {
                      "type": "LineString",
                      "coordinates": [feature.geometry.coordinates]
                    }
                    this.datasetMap.set(feature.properties.realtimeTripId, mappedFeature);
                  }
                  mappedFeature.properties.loadCounter = this.loadCounter;
                  mappedFeature.geometry.coordinates.push(feature.geometry.coordinates);
                  if (mappedFeature.geometry.coordinates.length > 6) {
                    mappedFeature.geometry.coordinates.splice(0, mappedFeature.geometry.coordinates.length - 6);
                  }
                  let a = 2;
                }
                const deleteTrips = []
                for (let trip of this.datasetMap) {
                  if (this.loadCounter - trip[1].properties.loadCounter > 6) {
                    deleteTrips.push(trip[0]);
                    console.log(`marking trip ${trip[1].properties.routeShortName} to ${trip[1].properties.tripHeadsign} for deletion`)
                  }
                }
                deleteTrips.forEach(trip=>this.datasetMap.delete(trip));

                const allTrips = Array.from(this.datasetMap.values());
                const allPositions = {
                  type: "FeatureCollection",
                  features: allTrips.map(feature=>{
                    return {
                      "type": "Feature",
                      "properties": feature.properties,
                      "geometry": {
                        "type": "Point",
                        "coordinates": feature.geometry.coordinates[feature.geometry.coordinates.length - 1]
                      }
                    }
                  })
                };
                this.map.getSource('ovtraffic1').setData(allPositions);
                this.map.getSource('ovtraffic2').setData({
                  type: "FeatureCollection",
                  features: allTrips
                })
                this.map.getSource('ovlabel').setData(allPositions);
            })
        }
    })
    setTimeout(()=>this._loadOv(), 5000);
  }
  _mapLoaded(e){
    let trafficLayer = new TrafficLayer('traffic', 'https://research.geodan.nl/sites/ndw_viewer/traffic.json')
	trafficLayer.loadTraffic();
    this.map.addLayer(trafficLayer);

    this.map.addLayer({
      "id": "building3d",
      "type": "fill-extrusion",
      "source" : {
        "id": "gebouwkenmerken2",
        "type": "vector",
        "tiles": ["https://saturnus.geodan.nl/mvt/gebouwkenmerken/{z}/{x}/{y}.mvt"],
        "minzoom": 11,
        "maxzoom" : 18,
      },
      "source-layer": "gebouwkenmerken",
      "minzoom": 11,
      "maxzoom": 24,
      "paint": {
        "fill-extrusion-color": "#4665DB",
        "fill-extrusion-base": 0,
        "fill-extrusion-height": ["get", "hoogte"],
        "fill-extrusion-opacity": 0.8
      },
    }, "waterway-label");


    const empty = {"type": "FeatureCollection", "Features": []}
    this.datasets = [empty,empty,empty,empty,empty];
    this.datasetMap = new Map();

    this.map.addLayer({
      "id": "liander_storingen",
      //"type": "fill",
      'type': 'fill-extrusion',
      "source": {
          "type": "geojson",
          "data": {
              "type": "FeatureCollection",
              "features": []
          }
      },
      "layout": {
      },
      "paint": {
        //"fill-color": '#FF0000',
        //"fill-opacity": 0.8,

        'fill-extrusion-color': '#FF00AA',
 
        'fill-extrusion-height': 80,
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': .8

      }
  })
  this.map.addLayer({
      "id": "ovtraffic1",
      "type": "circle",
      "source": {
          "type": "geojson",
          "data": {
              "type": "FeatureCollection",
              "features": []
          }
      },
      "paint": {
          "circle-radius": 5,
          "circle-color": ["match", ["get", "vehicle"], 
          "Bus", "red", 
          "Tram, Streetcar, Light rail", "lightgreen",
          "Ferry", "lightblue",
          "Subway, Metro", "orange",
          "black"]
      }
  })
  this.map.addLayer({
      "id": "ovtraffic2",
      "type": "line",
      "source": {
          "type": "geojson",
          "data": {
              "type": "FeatureCollection",
              "features": []
          }
      },
      "paint": {
          "line-width": 3,
          "line-dasharray": [3,1],
          "line-color": ["match", ["get", "vehicle"], 
          "Bus", "red", 
          "Tram, Streetcar, Light rail", "lightgreen",
          "Ferry", "lightblue",
          "Subway, Metro", "orange",
          "black"]
      }
  })  
  this.map.addLayer({
      "id": "ovlabel",
      "type": "symbol",
      "source": {
          "type": "geojson",
          "data": {
              "type": "FeatureCollection",
              "features": []
          }
      },
      "layout": {
          "text-field": "{routeShortName}",
          "text-offset": [0.5,-0.5]
      },
      "paint": {
          "text-color": "black",
          "text-halo-width": 4,
          "text-halo-color": "rgba(255,255,255,0.6)",
          "text-halo-blur": 2
      }

  })
  setTimeout(()=>this._loadOv(), 1000);
  setTimeout(()=>this._loadLianderStoringen(), 500);
  }
}

window.customElements.define('view-transport-map', ViewTransportMap);
