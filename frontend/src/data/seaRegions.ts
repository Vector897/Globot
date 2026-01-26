
// Simplified GeoJSON for Strategic Sea Regions
// IMPORTANT: Large oceans (Pacific, Indian) are listed FIRST so smaller seas render ON TOP for correct hover detection

export const SEA_REGIONS_GEOJSON = {
  "type": "FeatureCollection",
  "features": [
    // === LARGE OCEANS FIRST (Rendered at bottom z-order) ===
    
    // Pacific Ocean (West)
    {
        "type": "Feature",
        "properties": { "name": "Pacific Ocean" },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [125.0, -30.0], [125.0, 30.0], [180.0, 30.0], [180.0, -30.0], [125.0, -30.0]
            ]]
        }
    },
    // Pacific Ocean (East)
    {
        "type": "Feature",
        "properties": { "name": "Pacific Ocean" },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-180.0, -30.0], [-100.0, -30.0], [-100.0, 30.0], [-180.0, 30.0], [-180.0, -30.0]
            ]]
        }
    },
    // Indian Ocean (Monsoon Zone)
    {
        "type": "Feature",
        "properties": { "name": "Indian Ocean" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [50.0, 10.0], [80.0, 5.0], [100.0, -10.0], [100.0, -40.0],
            [40.0, -40.0], [40.0, 0.0], [50.0, 10.0]
          ]]
        }
    },
    // North Atlantic (High Seas Storms)
    {
      "type": "Feature",
      "properties": { "name": "North Atlantic Ocean" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [-70.0, 30.0], [-10.0, 30.0], [-5.0, 60.0], [-60.0, 60.0], [-70.0, 30.0]
        ]]
      }
    },

    // === MEDIUM SEAS (Rendered in middle) ===
    
    // Mediterranean Sea
    {
        "type": "Feature",
        "properties": { "name": "Mediterranean Sea" },
        "geometry": {
          "type": "Polygon",
          "coordinates": [[
            [-5.5, 36.0], [0.0, 42.0], [10.0, 45.0], [30.0, 40.0], [36.0, 36.0], 
            [35.0, 31.0], [20.0, 30.0], [0.0, 35.0], [-5.5, 36.0]
          ]]
        }
    },
    // South China Sea
    {
      "type": "Feature",
      "properties": { "name": "South China Sea" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [100.0, 0.0], [110.0, 20.0], [120.0, 25.0], [121.0, 10.0], 
          [110.0, 0.0], [100.0, 0.0]
        ]]
      }
    },
    // Arabian Sea
    {
        "type": "Feature",
        "properties": { "name": "Arabian Sea" },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [52.0, 15.0], [60.0, 25.0], [70.0, 22.0], [75.0, 10.0], 
                [60.0, 10.0], [52.0, 15.0]
            ]]
        }
    },
    // Bay of Bengal
    {
        "type": "Feature",
        "properties": { "name": "Bay of Bengal" },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [80.0, 10.0], [80.0, 20.0], [90.0, 22.0], [95.0, 18.0], 
                [95.0, 10.0], [80.0, 10.0]
            ]]
        }
    },

    // === SMALL SEAS & CHOKE POINTS (Rendered on top for priority detection) ===
    
    // Red Sea
    {
      "type": "Feature",
      "properties": { "name": "Red Sea" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [32.0, 30.0], [35.0, 28.0], [42.0, 15.0], [43.0, 12.5], 
          [40.0, 13.0], [32.0, 22.0], [32.0, 30.0]
        ]]
      }
    },
    // Gulf of Aden
    {
      "type": "Feature",
      "properties": { "name": "Gulf of Aden" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [43.0, 12.5], [51.0, 15.0], [53.0, 12.0], [45.0, 10.5], [43.0, 12.5]
        ]]
      }
    },
    // Strait of Malacca
    {
      "type": "Feature",
      "properties": { "name": "Strait of Malacca" },
      "geometry": {
        "type": "Polygon",
        "coordinates": [[
          [98.0, 8.0], [103.0, 2.0], [104.0, 1.0], [100.0, 1.5], 
          [95.0, 6.0], [98.0, 8.0]
        ]]
      }
    },
    // Black Sea
    {
        "type": "Feature",
        "properties": { "name": "Black Sea" },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [27.0, 42.0], [30.0, 46.0], [41.0, 46.0], [41.0, 41.0], 
                [35.0, 41.0], [27.0, 42.0]
            ]]
        }
    },
    // Caspian Sea
    {
        "type": "Feature",
        "properties": { "name": "Caspian Sea" },
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [47.0, 46.0], [54.0, 46.0], [54.0, 36.0], [47.0, 36.0], [47.0, 46.0]
            ]]
        }
    }
  ]
};
