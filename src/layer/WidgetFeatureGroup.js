/**
 * Special widget feature group to maintain seperation from L.FeatureGroup.
 */
L.WidgetFeatureGroup = L.LayerGroup.extend({
    toGeoJSON: function () {
        var features = [];
        this.eachLayer(function (layer) {
            features.push(layer.toGeoJSON());
        });

        return L.GeoJSONUtil.featureCollection(features);
    }
});

L.widgetFeatureGroup = function (layers) {
    return new L.WidgetFeatureGroup(layers);
};
