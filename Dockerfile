# ---- stage 1: build the React bundle ----
FROM node:22-alpine AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- stage 2: runtime ----
FROM python:3.13-slim

# Hugging Face Spaces runs the container as UID 1000, so everything below is owned
# by that user. Without this, pip and the build-time training hit permission errors.
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PYTHONUNBUFFERED=1
WORKDIR $HOME/app

COPY --chown=user backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY --chown=user backend/ backend/
COPY --chown=user dataset/ dataset/
COPY --from=frontend --chown=user /build/dist frontend/dist

# Train during the build instead of shipping a .joblib. A pickled model is tied to the
# scikit-learn version that created it; training against the version installed above
# removes any chance of a load-time mismatch. Takes about 1.3s.
RUN python backend/train_model.py

# Spaces exposes 7860 by default and injects $PORT at runtime.
EXPOSE 7860
CMD ["sh", "-c", "uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-7860}"]
