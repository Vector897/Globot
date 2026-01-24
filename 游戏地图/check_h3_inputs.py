import h3
import json

print(f"H3 Version: {h3.__version__}")

if not hasattr(h3, 'polygon_to_cells'):
    print("polygon_to_cells missing")
    exit()

print("Testing inputs for polygon_to_cells...")

# 1. Dictionary
try:
    h3.polygon_to_cells({'type': 'Polygon', 'coordinates': [[[0,0], [0,1], [1,1], [0,0]]]}, 3)
    print("SUCCESS: Dictionary")
except Exception as e:
    print(f"Dict failed: {e}")

# 2. String
try:
    h3.polygon_to_cells(json.dumps({'type': 'Polygon', 'coordinates': [[[0,0], [0,1], [1,1], [0,0]]]}), 3)
    print("SUCCESS: String")
except Exception as e:
    print(f"String failed: {e}")

# 3. List of loops (tuples)
try:
    poly = [((0,0), (0,1), (1,1), (0,0))] # List of tuple of tuples
    h3.polygon_to_cells(poly, 3)
    print("SUCCESS: List of loops (tuples)")
except Exception as e:
    print(f"List(tuples) failed: {e}")

# 4. H3.Polygon (if existing?)
try:
    p = h3.Polygon([[(0,0), (0,1), (1,1), (0,0)]])
    h3.polygon_to_cells(p, 3)
    print("SUCCESS: h3.Polygon")
except Exception as e:
    print(f"h3.Polygon failed: {e}")
