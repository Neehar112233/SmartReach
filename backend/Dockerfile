# ---- Build Stage ----
FROM python:3.12-slim AS builder

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# ---- Production Stage ----
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Create non-root user (UID 1000 for standard cloud & Hugging Face compatibility)
RUN useradd -m -u 1000 appuser

# Copy application code
COPY app/ ./app/

# Create uploads directory and set permissions
RUN mkdir -p /app/uploads/resumes && chown -R appuser:appuser /app

USER appuser

# Expose port (Render injects $PORT; default 7860 for Hugging Face / local Docker)
EXPOSE ${PORT:-7860}

# Health check (uses $PORT dynamically)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD python -c "import os,urllib.request; urllib.request.urlopen(f'http://localhost:{os.environ.get(\"PORT\",7860)}/api/health')" || exit 1

# Run with uvicorn on $PORT (Render / Railway) or 7860 (HF / local Docker)
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
