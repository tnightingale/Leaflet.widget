/*! Leaflet.widget - v0.1.0 - 2012-10-12
* Copyright (c) 2012 function () {

// If the string looks like an identifier, then we can return it as is.
// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can simply slap some quotes around it.
// Otherwise we must also replace the offending characters with safe
// sequences.

            if (ix.test(this)) {
                return this;
            }
            if (nx.test(this)) {
                return '"' + this.replace(nxg, function (a) {
                    var c = escapes[a];
                    if (c) {
                        return c;
                    }
                    return '\\u' + ('0000' + a.charCodeAt().toString(16)).slice(-4);
                }) + '"';
            }
            return '"' + this + '"';
        }; */

L.Control.Draw.mergeOptions({
    select: {
        title: 'Select items'
    }
});

// TODO: Remove hack to 'open' object.
var onAdd = L.Control.Draw.prototype.onAdd;

L.Control.Draw.include({
    onAdd: function (map) {
        var className = 'leaflet-control-draw',
            container = onAdd.call(this, map);

        if (this.options.select) {
            this.handlers.select = new L.Handler.Select(map, this.options.select);
            this._createButton(
                    this.options.select.title,
                    className + '-select',
                    container,
                    this.handlers.select.enable,
                    this.handlers.select
            );
            this.handlers.select.on('activated', this._disableInactiveModes, this);
        }

        return container;
    }
});

L.Handler.Select = L.Handler.extend({
    includes: L.Mixin.Events,

    options: {

    },

    initialize: function (map, options) {
        L.Util.setOptions(this, options);
        this._map = map;
    },

    enable: function () {
        this.fire('activated');
        L.Handler.prototype.enable.call(this);
    },

    // Called when handler is enabled.
    addHooks: function () {
        if (this._map && this.options.selectable) {
            this._selected = L.layerGroup();
            this._selectable = this.options.selectable;

            this._selectable.eachLayer(function (layer) {
                this._bind(layer);
            }, this);

            this._map.on({
                // TODO: Determine whether this is necessary: can layers be
                //       added while this handler is enabled?
                layeradd: this._bind,
                layerremove: this._unbind
            }, this);
        }
    },

    // Called when handler is disabled.
    removeHooks: function () {
        if (this._map && this._selectable) {
            // Clean up selected layers.
            this._selectable.eachLayer(function (layer) {
                this._unbind(layer);
            }, this);
            delete this._selected;

            this._map.off({
                layeradd: this._bind,
                layerremove: this._unbind
            }, this);
        }
    },

    select: function (e) {
        var layer = e.layer || e.target || e;
        layer.off('click', this.select);
        layer.on('click', this.deselect, this);
        this._selected.addLayer(layer);
        this._map.fire('selected', { layer: layer });
    },

    deselect: function (e, permanent) {
        var layer = e.layer || e.target || e;
        layer.off('click', this.deselect);
        this._selected.removeLayer(layer);
        this._map.fire('deselected', { layer: layer });

        if (!permanent) {
            layer.on('click', this.select, this);
        }
    },

    applyToSelected: function (callback, context) {
        this._selected.eachLayer(callback, context);
    },

    _bind: function (e) {
        var layer = e.layer ? e.layer : e;
        if (this._selectable.hasLayer(layer)) {
            layer.on('click', this.select, this);
        }
    },

    _unbind: function (e) {
        var layer = e.layer ? e.layer : e;
        if (this._selectable.hasLayer(layer)) {
            if (this._selected.hasLayer(layer)) {
                this.deselect(layer, true);
            }
        }
    }
});

L.LayerGroup.include({
    hasLayer: function (layer) {
        return !!this._layers[L.Util.stamp(layer)];
    }
});

L.Control.Select = L.Control.extend({
    options: {
        position: 'bottomright',
        remove: true
    },

    onAdd: function (map) {
        this._map = map;

        var class_name = 'leaflet-select-control',
            container = L.DomUtil.create('div', class_name);

        if (this.options.remove) {
            this._createButton('Remove selected features',
                    class_name + '-remove',
                    container,
                    this._delete,
                    this
            );
        }

        return container;
    },

    _delete: function () {
        this._map.drawControl.handlers.select.applyToSelected(function (layer) {
            this._map.removeLayer(layer);
        }, this);
    },

    _createButton: function (title, className, container, fn, context) {
        var link = L.DomUtil.create('a', className, container);
        link.href = '#';
        link.title = title;

        L.DomEvent
                .on(link, 'click', L.DomEvent.stopPropagation)
                .on(link, 'mousedown', L.DomEvent.stopPropagation)
                .on(link, 'dblclick', L.DomEvent.stopPropagation)
                .on(link, 'click', L.DomEvent.preventDefault)
                .on(link, 'click', fn, context);

        return link;
    }
});

L.Map.addInitHook(function () {
    if (this.options.select) {
        this.selectControl = new L.Control.Select();
        this.addControl(this.selectControl);
    }
});

L.Control.select = function (options) {
    return new L.Control.Select(options);
};

L.Map.mergeOptions({
    widget: false
});

L.Handler.Widget = L.Handler.extend({
    includes: L.Mixin.Events,

    options: {
        defaultVectorStyle: {
            color: '#0033ff'
        },
        selectedVectorStyle: {
            color: '#F00'
        },
        drawVectorStyle: {
            color: '#F0F',
            clickable: true
        }
    },

    initialize: function (map, options) {
        this._map = map;

        L.Util.setOptions(this, options);

        if (!this._map.drawControl) {
            this._initDraw();
        }
    },

    addHooks: function () {
        if (this._map && this.options.attach) {
            this.vectors = L.layerGroup().addTo(this._map);
            this._attach = L.DomUtil.get(this.options.attach);
            this.load(this._attach.value);

            this._map.drawControl.handlers.select.options.selectable = this.vectors;

            // Map event handlers.
            this._map.on({
                'draw:poly-created draw:marker-created': this._onCreated,
                'selected': this._onSelected,
                'deselected': this._onDeselected,
                'layerremove': this._unbind
            }, this);
        }
    },

    removeHooks: function () {
        if (this._map) {
            this._map.removeLayer(this.vectors);
            delete this.vectors;

            this._map.off({
                'draw:poly-created draw:marker-created': this._onCreated,
                'selected': this._onSelected,
                'deselected': this._onDeselected,
                'layerremove': this._unbind
            }, this);
        }
    },

    _initDraw: function () {
        this._map.drawControl = new L.Control.Draw({
            position: 'topright',
            polyline: { shapeOptions: this.options.drawVectorStyle },
            polygon: { shapeOptions: this.options.drawVectorStyle },
            circle: false,
            rectangle: false
        }).addTo(this._map);
    },

    // Add vector layers.
    _addVector: function (feature) {
        this.vectors.addLayer(feature);
    },

    // Handle features drawn by user.
    _onCreated: function (e) {
        var key = /(?!:)[a-z]+(?=-)/.exec(e.type)[0],
            vector = e[key] || false;

        if (vector) {
            this._addVector(vector);
        }
    },

    _onSelected: function (e) {
        var layer = e.layer;
        if (layer.setStyle) {
            layer.setStyle(this.options.selectedVectorStyle);
        }
        else {
            var icon = layer.options.icon;
            icon.options.className = 'marker-selected';
            layer.setIcon(icon);
            icon.options.className = '';
        }
    },

    _onDeselected: function (e) {
        var layer = e.layer;
        if (layer.setStyle) {
            layer.setStyle(this.options.defaultVectorStyle);
        }
        else {
            layer.setIcon(layer.options.icon);
        }
    },

    _unbind: function (e) {
        var layer = e.layer;
        this.vectors.removeLayer(layer);
    },

    // Read GeoJSON features into widget vector layers.
    load: function (geojson) {
        var data = typeof geojson === 'string' ? JSON.parse(geojson) : geojson,
            on_each = function (feature, layer) {
                this._addVector(layer);
            };

        if (!data) {
            return;
        }

        return L.geoJson(data, {
            onEachFeature: L.Util.bind(on_each, this)
        });
    },

    // Write widget vector layers to GeoJSON.
    toGeoJSON: function () {
        var geometry,
            features = [];

        this.vectors.eachLayer(function (layer) {
            geometry = this.vectorToGeometry(layer);
            features.push(this.feature(geometry));
        }, this);

        return this.featureCollection(features);
    },

    write: function () {
        var obj = this.toGeoJSON();
        this._attach.value = JSON.stringify(obj);
    },

    vectorToGeometry: function (vector) {
        var geometry = {};

        if (vector instanceof L.MultiPolygon) {
            geometry.type = "MultiPolygon";
            geometry.coordinates = [];
            vector.eachLayer(function (layer) {
                geometry.coordinates.push(this.vectorToGeometry(layer).coordinates);
            }, this);
        }
        else if (vector instanceof L.MultiPolyline) {
            geometry.type = "MultiLineString";
            geometry.coordinates = [];
            vector.eachLayer(function (layer) {
                geometry.coordinates.push(this.vectorToGeometry(layer).coordinates);
            }, this);
        }
        else if (vector instanceof L.FeatureGroup) {
            geometry.type = "MultiPoint";
            geometry.coordinates = [];
            vector.eachLayer(function (layer) {
                var obj = this.vectorToGeometry(layer);
                // We're assuming a FeatureGroup only contains Points
                // (currently no support for 'GeometryCollections').
                if (obj.type !== "Point") {
                    return;
                }
                geometry.coordinates.push(obj.coordinates);
            }, this);
        }
        else if (vector instanceof L.Polygon) {
            geometry.type = "Polygon";
            geometry.coordinates = [this._latLngsToCoords(vector.getLatLngs())];
        }
        else if (vector instanceof L.Polyline) {
            geometry.type = "LineString";
            geometry.coordinates = this._latLngsToCoords(vector.getLatLngs());
        }
        else if (vector instanceof L.Marker) {
            geometry.type = "Point";
            geometry.coordinates = this._latLngToCoord(vector.getLatLng());
        }

        return geometry;
    },

    featureCollection: function (features) {
        return {
            type: 'FeatureCollection',
            features: features || []
        };
    },

    feature: function (geometry, properties) {
        return {
            "type": "Feature",
            "geometry": geometry,
            "properties": properties || {}
        };
    },

    _latLngsToCoords: function (latlngs) {
        var coords = [],
            coord;

        for (var i = 0, len = latlngs.length; i < len; i++) {
            coord = this._latLngToCoord(latlngs[i]);
            coords.push(coord);
        }

        return coords;
    },

    _latLngToCoord: function (latlng) {
        return [latlng.lng, latlng.lat];
    }
});

L.Map.addInitHook(function () {
    if (this.options.widget) {
        var options = this.options.widget;
        this.widget = new L.Handler.Widget(this, options);
    }
});
