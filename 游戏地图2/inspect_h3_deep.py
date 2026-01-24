import h3
import inspect

print(f"H3 File: {h3.__file__}")

print("\n--- DIR(h3) ---")
print([x for x in dir(h3) if 'poly' in x.lower() or 'geo' in x.lower()])

try:
    print("\n--- Signature ---")
    print(inspect.signature(h3.polygon_to_cells))
except Exception as e:
    print(f"Sig Error: {e}")
    
try:
    print("\n--- Doc ---")
    print(h3.polygon_to_cells.__doc__)
except:
    pass
