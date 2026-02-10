# Backend-only Dockerfile for Separate Deployment (e.g., Zeabur, Render, Railway)
FROM python:3.10-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code
COPY . .

# Create necessary data directories
RUN mkdir -p data/vectordb data/uploads

# Expose the port (Zeabur automatically detects or uses PORT env)
EXPOSE 8080

# Environment variables
ENV PORT=8080
ENV LOG_LEVEL=info

# Run the application
CMD ["python", "main.py"]
