# Use Python 3.11 slim image for smaller size and better security
FROM python:3.11-slim as builder

# Set environment variables for Python optimization
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies needed for Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Create and use a non-root user for security
RUN useradd --create-home --shell /bin/bash app

# Set work directory and change ownership
WORKDIR /app
RUN chown app:app /app

# Switch to the app user for pip install
USER app

# Copy requirements first for better Docker layer caching
COPY requirements.txt .

# Install Python dependencies as the app user
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONHASHSEED=random \
    PATH="/home/app/.local/bin:$PATH"

# Create non-root user
RUN useradd --create-home --shell /bin/bash app

# Copy installed packages from builder stage
COPY --from=builder /home/app/.local /home/app/.local

# Set work directory and change ownership
WORKDIR /app
RUN chown app:app /app

# Switch to non-root user
USER app

# Copy application code
COPY --chown=app:app . .

# Expose the port that Cloud Run expects
EXPOSE 8080

# Health check for Cloud Run
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD python -c "import requests; import os; port = os.environ.get('PORT', '8080'); requests.get(f'http://localhost:{port}/')" || exit 1

# Use exec form for better signal handling in containers
CMD uvicorn main:app --host 0.0.0.0 --port "$PORT" --workers 1