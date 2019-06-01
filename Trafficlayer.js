/*******************************************************************************
* TrafficLayer - implements animated traffic flows as a custom mapbox layer
* Author: Rubio Vaughan - Geodan
* Version: 0.9
* Date: 21 March 2019
* Requires: Mapbox GL JS (https://github.com/mapbox/mapbox-gl-js)
*           TWGL (https://twgljs.org/)
*
* Usage:
* var map = window.map = new mapboxgl.Map({
*     container: 'map',
*     style: 'mapbox://styles/mapbox/dark-v9',
* });
*
* map.on('load', function() {
* 	let trafficLayer = new TrafficLayer('traffic', <url to traffic json>)
* 	trafficLayer.loadTraffic();
*     map.addLayer(trafficLayer);
* });
*******************************************************************************/

class TrafficLayer {
    constructor(id, url) {
        this.id = id;
        this.type = 'custom';
        this.renderingMode = '3d';
		this.url = url;
		this.vertices = null;
		this.vertexTimes = null;
		this.flowRates = null;
		this.colors = null;
		this.reds = null;
		this.greens = null;
		this.lastUpdate = '';
		this.map = null;
		this.gl = null;
		this.matrix = null;
		this.trafficPromise = null;
		this.interval = null;
    }
	project(x, y) { // converts EPSG:3857 coordinates to mapbox coordinates
		const extent = 20037508.3427892;
		return ([(x + extent) / (2.0 * extent), (y - extent) / (-2.0*extent)]);
	}
	loadTraffic() {
		let self = this;
		this.trafficPromise = new Promise((resolve, reject) => {
			fetch(self.url)
				.then(response => response.json())
				.then(json => self.genTraffic(json))
				.then(function(){console.log('trafficPromise resolved'); resolve()})
				.catch(error => {
					console.log(error)
					reject(error);
				});
		});
	}
	genTraffic(data){
		var self = this;
		return new Promise((resolve, reject) => {
			//console.log('starting genTraffic');
			const RUNTIME = 10;
			const MARGIN = 0;
			const DEFAULT_FLOW = 400;
			const DEFAULT_SPEED_MOTORWAY = 100;
			const DEFAULT_SPEED_LINK = 70;
			const VALID_SPEED = { min: 1, max: 200}; // valid range for vehicle speed (km/h)
			const VALID_FLOW = { min: 1, max: 4000}; // valid range for vehicle flow (vehicles/h)
			const SPEED_COLOR = { min: 60, max: 110 }; // coloring will be based on this range, with min being green and max being red

			let vertices = [];
			let vertexTimes = [];
			let flowRates = [];
			let colors = [];
			let reds = [];
			let greens = [];
			let id = 0;
			let lastflow = 0;
			
			let featureMap = data.features.reduce(function(map, obj) {
				map[obj.properties.osm_id] = obj;
				return map;
			});

			let lastUpdate = '';
			for (let i = 0; i < data.features.length; i++) {
				let feature = data.features[i];
				if (lastUpdate == '')
					lastUpdate = feature.properties.date;
				
				let speed = feature.properties.speed;
				const speedrange = SPEED_COLOR.max - SPEED_COLOR.min;
				let speedratio = Math.max(0, Math.min(1.0, (speed - SPEED_COLOR.min) / speedrange));
				let red = 255.0 - Math.round(Math.max(0, speedratio - 0.5) * 510.0);
				let green = Math.min(0.5, speedratio) * 510.0;
				
				let flow = feature.properties.flow;
				//if (feature.properties.maxspeed) speed = feature.properties.maxspeed;
				/*
				below is for flow and speed arrays
				if (feature.properties.flow && feature.properties.speed ) {
					let validRange = {min: 1, max: 4000};
					let avgfunc = function(a, b) { 
							if (b < validRange.min || b > validRange.max) return a; 
							a.count++;
							a.sum += b;
							a.avg = a.sum / a.count;
							return a;
					}
					flow = feature.properties.flow.reduce(avgfunc, {count: 0, sum: 0, avg: 0}).avg;
					validRange.max = 200;
					speed =	feature.properties.speed.reduce(avgfunc, {count: 0, sum: 0, avg: 0}).avg;
				}
				*/
				
				if (speed < VALID_SPEED.min || speed > VALID_SPEED.max ||
					flow < VALID_FLOW.min || flow > VALID_FLOW.max) {
					continue;
				}
				
				let delay = 3600.0 / flow;
				let loc1 = feature.geometry.coordinates[0];
				let track_time = 0.0;
				for (let j = 1; j < feature.geometry.coordinates.length; j++) {
					let loc2 = feature.geometry.coordinates[j];
					let dist = Math.sqrt( Math.pow(loc2[0] - loc1[0], 2) + Math.pow(loc2[1] - loc1[1], 2));
					let time_delta = dist / (speed / 3.6); // km/h => m/s
					let loc1_p = self.project(loc1[0], loc1[1]);
					let loc2_p = self.project(loc2[0], loc2[1]);
					vertices.push(loc1_p[0], loc1_p[1], loc2_p[0], loc2_p[1])
					vertexTimes.push(track_time, track_time + time_delta);
					flowRates.push(delay, delay);
					colors.push(red, green, red, green);
					track_time += time_delta;
					loc1 = loc2;
				}
				id++;
			}
			self.vertices = vertices;
			self.vertexTimes = vertexTimes;
			self.flowRates = flowRates;
			self.colors = colors;
			resolve();
		});
	}
	onAdd(map, gl) {
		this.map = map;
		this.gl = gl;
		let self = this;
		this.trafficPromise.then(function(){
			const vs = `
				precision highp float;
				attribute vec4 position;
				attribute float vertexTime;
				attribute float flowRate;
				attribute vec2 color;
				varying float vTime;
				varying float vFlowRate;
				varying vec4 vColor;
				uniform float currentTime;
				uniform mat4 uMatrix;
				void main() {
					
					gl_Position = uMatrix * position;
					vTime = -(currentTime - vertexTime);
					vFlowRate = flowRate;
					vColor = vec4(color / 255.0, 0.0, 1.0);
				}
			`;
			const fs = `
				precision highp float;
				varying float vTime;
				varying float vFlowRate;
				varying vec4 vColor;
				void main() {
					float colorMultiplier = 0.0;
					float flowRateFactor = mod(vTime, vFlowRate);
					if (flowRateFactor < 2.0) {
						colorMultiplier = min(1.0, flowRateFactor);// / trailLength * 2.0;
					}
					gl_FragColor = vColor * colorMultiplier;
				}
			`;

			// compile shaders, link program, look up uinforms
			self.programInfo = twgl.createProgramInfo(gl, [vs, fs]);
			self.programInfo.program.uMatrix = gl.getUniformLocation(self.programInfo.program, "uMatrix");
			
			/*console.log('vertices: ' + self.vertices.length);
			console.log('vertexTimes: ' + self.vertexTimes.length);
			console.log('flowRates: ' + self.flowRates.length);
			console.log('colors: ' + self.colors.length);*/
			self.bufferInfo = twgl.createBufferInfoFromArrays(gl, {
					position : {
						numComponents : 2,
						data : self.vertices
					},
					vertexTime : {
						numComponents : 1,
						data : self.vertexTimes
					},
					flowRate : {
						numComponents : 1,
						data : self.flowRates
					},
					color : {
						numComponents: 2,
						data: self.colors
					}
				});		
		});
	}
	render(gl, matrix) {
		let currentTime = (Date.now() % 1000000) * 0.001; // seconds

		if (!this.vertices || !matrix) {
			this.map.repaint = true;
			return;
		}
		this.matrix = matrix;
		
		gl.useProgram(this.programInfo.program);
		// calls gl.bindBuffer, gl.enableVertexAttribArray, gl.vertexAttribPointer
		twgl.setBuffersAndAttributes(gl, this.programInfo, this.bufferInfo);
		// calls gl.uniformXXX
		twgl.setUniforms(this.programInfo, { currentTime: currentTime });
		gl.uniformMatrix4fv(this.programInfo.program.uMatrix, false, matrix);

		//gl.clearColor(0.0, 0.0, 0.0, 0.0);		
		// calls gl.drawArrays or gl.drawElements
		twgl.drawBufferInfo(gl, this.bufferInfo, gl.LINES);
		this.map.repaint = true;
	}
}