L.Widget = L.Class.extend({
    options: {
        defaultVectorStyle: {
            color: '#0033ff',
        },
        selectedVectorStyle: {
            color: '#F00',
        }
    },

    /**
     * Initialize map & widget.
     */
    initialize: function (item, data, options) {
        L.Util.setOptions(this, options);

        var shape_options = {
                color: '#F0F',
                opacity: 0.9,
                fillColor: '#F0F',
                fillOpacity: 0.2
            },
            draw_control = new L.Control.Draw({
                position: 'topright',
                polyline: { shapeOptions: shape_options },
                polygon: { shapeOptions: shape_options },
                circle: false,
                rectangle: false
            });

        // Init map.
        this._map = L.map(item {
            layers: [L.tileLayer(options.baseUrl)]
        });

        // Add controls.
        this._map.addControl(draw_control);

        // Adding layers.
        this.vectors = L.layerGroup().addTo(this._map);

        // Load existing data.
        this.unserialize(data);

        // Map event handlers.
        this._map.on({
            'draw:poly-created draw:marker-created': this._onCreated,
            selected: this._onSelected,
            deselected: this._onDeselected,
            layerremove: this._unbind
        }, this);

        this._map.setView([49.26, -123.11], 10);
    },

    /**
     * Add vector layers.
     */
    _addVector: function (feature) {
        this.vectors.addLayer(feature);
    },

    /**
     * Handle features drawn by user.
     */
    _onCreated: function (e) {
        var key = /(?!:)[a-z]+(?=-)/.exec(e.type)[0];
        vector = e[key] || false;

        if (vector) {
            this._addVector(vector);
        }
    },

    _onSelected: function (e) {
        var layer = e.layer;
        if (layer instanceof L.Path) {
            layer.setStyle(this.options.selectedVectorStyle);
        }
    },

    _onDeselected: function (e) {
        var layer = e.layer;
        if (layer instanceof L.Path) {
            layer.setStyle(this.options.defaultVectorStyle);
        }
    },

    _unbind: function (e) {
        var layer = e.layer;
        this.vectors.removeLayer(layer);
    },

    /**
     * Read GeoJSON features into widget vector layers.
     */
    unserialize: function (data) {
        var on_each = function (feature, layer) { this._addVector(layer) },
            options = {
                onEachFeature: L.Util.bind(on_each, this)
            };
        return L.geoJson(data, options);
    },

    /**
     * Write widget vector layers to GeoJSON.
     */
    serialize: function () {
        var geometry,
            features = [];

        this.vectors.eachLayer(function (layer) {
            geometry = this.vectorToGeometry(layer);
            features.push(this.feature(geometry));
        }, this);

        return JSON.stringify(this.featureCollection(features));
    },

    getSubmitHandler: function (dest) { /* dest: HTML Element */
        return L.Util.bind(function submit_handler() {
            dest.val(this.serialize());
        }, this);
    },

    /**
     * TODO: Break this up into individual 'toGeomtery' methods on each 
     *       vector layer.
     */
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
                if (obj.type !== "Point") return;
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
