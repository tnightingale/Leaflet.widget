L.MultiPolygon.include({
    toGeometry: function () {
        var coords = [];

        this.eachLayer(function (layer) {
            coords.push(layer.toGeometry().coordinates);
        });

        return {
            type: "MultiPolygon",
            coordinates: coords
        };
    },

    toGeoJSON: function () {
        return L.GeoJSONUtil.feature(this.toGeometry());
    }
});
