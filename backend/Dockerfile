# backend/Dockerfile

FROM python:3.11-slim
WORKDIR /app
# Make Python log output appear immediately in container logs
ENV PYTHONUNBUFFERED=1
# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--access-logfile", "-", "--error-logfile", "-", "--capture-output", "--log-level", "info", "app:create_app()"]
