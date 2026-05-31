# ==========================================
# Stage 1: Build the Next.js Frontend
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app/frontend

# Install dependencies (only copy what's needed for install to cache layer)
COPY frontend/package*.json ./
RUN npm ci

# Copy rest of the frontend source
COPY frontend/ ./

ENV NEXT_TELEMETRY_DISABLED=1
ENV DISABLE_ESLINT_PLUGIN=true
ENV NODE_OPTIONS="--max-old-space-size=192"

# Build Next.js app (outputs to /app/frontend/out because of next.config.ts export)
RUN npm run build


# ==========================================
# Stage 2: Build the FastAPI Backend
# ==========================================
FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

# Set work directory
WORKDIR /app

# Set timezone to IST (Asia/Kolkata)
ENV TZ="Asia/Kolkata"
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata && \
    ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

# Install uv for fast package management
RUN pip install uv

# Copy backend dependencies
COPY pyproject.toml uv.lock ./

# Install backend dependencies directly from pyproject to avoid cross-platform issues
RUN uv pip install --system -r pyproject.toml

# Browsers are already included in the mcr.microsoft.com/playwright/python base image.
# Skipping playwright install to drastically speed up the build.

# Copy backend project files
COPY . .

# Copy the built static files from Stage 1
COPY --from=builder /app/frontend/out /app/frontend/out

# Expose port (Railway defaults to providing PORT env var)
ENV PORT=8000
EXPOSE 8000

# Run the FastAPI server using sh to correctly expand the PORT environment variable
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
