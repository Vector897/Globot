try:
    from h3 import Polygon
    print("Imported Polygon")
except ImportError:
    print("Cannot import Polygon")

try:
    from h3 import GeoJSON
    print("Imported GeoJSON")
except ImportError:
    print("Cannot import GeoJSON")
