FROM python:3.11-slim

WORKDIR /app

# System deps for python-pptx (lxml) and Pillow
RUN apt-get update \
    && apt-get install -y --no-install-recommends gcc curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8001

# --reload is intentionally disabled in container; use docker compose restart to reload.
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
