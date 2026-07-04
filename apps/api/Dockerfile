FROM python:3.12-slim
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy packages and api source
COPY packages/poker  packages/poker
COPY packages/resume packages/resume
COPY apps/api        apps/api

# Install all packages into system Python
RUN uv pip install --system -e packages/poker -e packages/resume -e apps/api

EXPOSE 8000
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]
