L.FeatureGroup.include({
    toGeometry: function () {
        var coords = [];
        this.eachLayer(function (layer) {
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
        return L.GeoJSONUtil.feature(this.toGeometry());
    }
});
