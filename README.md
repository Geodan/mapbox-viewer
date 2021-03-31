# Mapbox-viewer

This project is largely based on [https://www.mapbox.com/mapbox-gl-js/examples/](https://www.mapbox.com/mapbox-gl-js/examples/).

mapbox-gl is an open source web-viewer backed by MapBox inc and a large community. The examples in this repository show that mapbox-gl can also be used independently of the MapBox services (no built-in MapBox vendor lock-in).

### Mapbox vs OpenLayers
MapBox supports only one projection, spherical Mercator or pseudo Mercator (EPSG:3857) which is the de-facto standard for
maps on the web. OpenLayers supports many. OpenLayers has better support for OGC standards such as WMS and WFS. MapBox
has better support for vector tiles and fast rendering using webgl. OpenLayers has a broader and more complete feature
set. MapBox takes advantage of newer technologies

## Requirements
* git (or download zip file)
* node / npm (or a webserver)

## Install
```
git clone this_repository
cd this_repository
npm start
# point your web-browser to one of the displayed urls
```
