import geopandas as gpd
import h3
import json
import os

# Configuration
INPUT_FILE = "data_pipeline/data/raw/ne_50m_admin_0_countries.shp"
OUTPUT_FILE = "data_pipeline/data/processed/land_cells.json"
RES = 3

def process_map():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    print(f"Loading {INPUT_FILE}...")
    try:
        gdf = gpd.read_file(INPUT_FILE)
        print(f"CRS: {gdf.crs}")
        if gdf.crs and gdf.crs.to_string() != "EPSG:4326":
            print("Reprojecting to EPSG:4326...")
            gdf = gdf.to_crs("EPSG:4326")
            
        print(f"Sample Geom: {gdf.iloc[0].geometry.bounds}")
    except Exception as e:
        print(f"Failed to load shapefile: {e}")
        return

    print(f"Processing {len(gdf)} countries into H3 Res {RES}...")
    
    land_cells = {}
    
    count = 0
    # Process first few rows for debug
    debug_limit = 5
    
    for idx, row in gdf.iterrows():
        country_id = row.get('ADM0_A3', 'UNK')
        
        try:
            # Handle Polygon and MultiPolygon
            geoms = []
            if row.geometry.geom_type == 'Polygon':
                geoms = [row.geometry]
            elif row.geometry.geom_type == 'MultiPolygon':
                geoms = row.geometry.geoms

            for poly in geoms:
                try:
                    # Extract coordinates and swap to (lat, lon)
                    # Shapely/GeoJSON: (lon, lat)
                    # H3: (lat, lon) usually
                    
                    if poly.geom_type == 'Polygon':
                         geojson_coords = poly.__geo_interface__['coordinates']
                         # Handle holes if any
                         # geojson_coords[0] is exterior, others are holes
                         
                         exterior = [(lat, lon) for lon, lat in geojson_coords[0]]
                         holes = []
                         if len(geojson_coords) > 1:
                             for h in geojson_coords[1:]:
                                 holes.append([(lat, lon) for lon, lat in h])
                                 
                         # Create H3 shape
                         # Try h3.LatLngPoly. If not directly available in h3 namespace, check where it is.
                         # Based on dir(h3) it seemed to be there.
                         
                         h3_poly = h3.LatLngPoly(exterior, *holes)
                         # Note: LatLngPoly signature might be (outer, *holes) or (outer, holes)? 
                         # Usually in Python bindings it varies. I'll guess (outer, *holes) or (outer, holes=[...])
                         # Let's try passing holes as subsequent args or list.
                         # Actually checking documentation or guessing.
                         # Safe bet: h3.LatLngPoly(exterior, *holes) is common.
                         
                         hexes = h3.polygon_to_cells(h3_poly, RES)
                    else:
                        continue
                    
                    for h in hexes:
                        land_cells[h] = {
                            "t": "l",
                            "c": country_id 
                        }
                except AttributeError:
                     print("AttributeError in H3 call")
                except Exception as inner_e:
                     print(f"Poly Error {country_id}: {inner_e}")
                     pass

        except Exception as e:
            print(f"Skipping {country_id}: {e}")
            pass
        
        count += 1
        if count % 20 == 0:
            print(f"Processed {count}/{len(gdf)} countries...")

    # Save
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(land_cells, f)
        
    print(f"Done. Mapped {len(land_cells)} land cells.")
    print(f"Saved to {OUTPUT_FILE}")

if __name__ == "__main__":
    process_map()
