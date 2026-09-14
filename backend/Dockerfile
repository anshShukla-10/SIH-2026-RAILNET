FROM python:3.12-slim

WORKDIR /app

# Install system dependencies needed for native builds and health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy prisma schema and generate Python client
COPY prisma/ ./prisma/
RUN prisma generate --schema=./prisma/schema.prisma

# Copy application source code
COPY api/ ./api/
COPY optimization/ ./optimization/
COPY services/ ./services/
COPY scripts/ ./scripts/
COPY data/ ./data/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]

