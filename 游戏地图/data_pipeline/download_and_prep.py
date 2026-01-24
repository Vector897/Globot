import os
import requests
import zipfile
import io

DATA_URL = "https://naturalearth.s3.amazonaws.com/50m_cultural/ne_50m_admin_0_countries.zip"
TARGET_DIR = "data_pipeline/data/raw"

def download_and_extract():
    if not os.path.exists(TARGET_DIR):
        os.makedirs(TARGET_DIR)
        print(f"Created directory: {TARGET_DIR}")

    print(f"Downloading data from {DATA_URL}...")
    try:
        r = requests.get(DATA_URL)
        r.raise_for_status()
        print("Download complete. Extracting...")
        
        z = zipfile.ZipFile(io.BytesIO(r.content))
        z.extractall(TARGET_DIR)
        print(f"Extracted to {TARGET_DIR}")
        
        # Verify
        files = os.listdir(TARGET_DIR)
        print(f"Files: {files}")
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    download_and_extract()
