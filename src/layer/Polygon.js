L.Polygon.include({
    toGeometry: function () {
        return {
            type: "Polygon",
            coordinates: [L.GeoJSONUtil.latLngsToCoords(this.getLatLngs())]
        };
    }
});
