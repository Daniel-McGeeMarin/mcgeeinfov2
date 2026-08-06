FROM python:3.12-slim
WORKDIR /app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY packages/finance  packages/finance
COPY apps/finance-api  apps/finance-api

RUN uv pip install --system --no-sources -e packages/finance -e apps/finance-api

EXPOSE 8000
CMD ["uvicorn", "finance_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
