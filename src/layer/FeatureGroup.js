L.FeatureGroup.include({
    toGeometry: function () {
        var coords = [];
        vector.eachLayer(function (layer) {
            var geom = layer.toGeometry();
            if (geom.type !== "Point") {
                // We're assuming a FeatureGroup only contains Points
                // (currently no support for 'GeometryCollections').
                return;
            }
            coords.push(geom.coordinates);
        });

        return {
            type: "MultiPoint",
            coordinates: coords
        };
    },

    toGeoJSON: function () {
        var features = [];
        this.eachLayer(function (layer) {
            features.push(layer.toGeoJSON());
        });

        return L.GeoJSONUtil.featureCollection(features);
    }
});
