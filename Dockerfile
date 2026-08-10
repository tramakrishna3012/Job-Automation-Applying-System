# ==========================================
# Stage 1: Build the Next.js Frontend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Install dependencies
COPY frontend/package*.json ./
RUN npm ci

# Copy rest of the frontend source
COPY frontend/ ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV DISABLE_ESLINT_PLUGIN=true
ENV NODE_OPTIONS="--max-old-space-size=192"

# Build Next.js app (outputs to /app/frontend/out)
RUN npm run build


# ==========================================
# Stage 2: Build the FastAPI Backend with Requesty & WeasyPrint
# ==========================================
FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

# Set work directory
WORKDIR /app

# Set timezone to IST (Asia/Kolkata)
ENV TZ="Asia/Kolkata"

# Install WeasyPrint system C-libraries and tzdata
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y \
    tzdata \
    libpango-1.0-0 \
    libpangoft2-1.0-0 \
    libcairo2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    fontconfig \
    && ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package management
RUN pip install uv

# Copy backend dependencies
COPY pyproject.toml ./

# Install backend dependencies directly from pyproject
RUN uv pip install --system -r pyproject.toml

# Copy backend project files
COPY . .

# Copy the built static files from Stage 1
COPY --from=builder /app/frontend/out /app/frontend/out

# Expose port (Railway defaults to providing PORT env var)
ENV PORT=8000
EXPOSE 8000

# Run the FastAPI server using sh to correctly expand the PORT environment variable
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
