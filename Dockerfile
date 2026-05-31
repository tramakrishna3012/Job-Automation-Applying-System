# Use official Python runtime as a parent image
FROM mcr.microsoft.com/playwright/python:v1.42.0-jammy

# Set work directory
WORKDIR /app

# Install uv for fast package management
RUN pip install uv

# Copy dependencies
COPY requirements.txt .

# Install dependencies
RUN uv pip install --system -r requirements.txt

# We explicitly install Playwright browsers in case the image doesn't cover the specific version required by playwright-stealth
RUN uv run playwright install chromium

# Copy project files
COPY . .

# Expose port (Railway defaults to providing PORT env var)
ENV PORT=8000
EXPOSE 8000

# Run the FastAPI server using sh to correctly expand the PORT environment variable
CMD ["sh", "-c", "uvicorn api.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
