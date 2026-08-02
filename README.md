# ColdTrack AI

Sistem prediksi dini kegagalan rantai dingin (cold chain) berbasis AI, dibangun untuk COMPFEST 18 AI Innovation Challenge — kategori Smart Logistics.

<!-- ![demo](docs/demo.gif) -->
> 🎬 GIF demo akan ditambahkan di sini.

## Cara Menjalankan

```bash
docker compose up --build
```

> Detail environment variable, port, dan langkah setup tambahan akan dilengkapi seiring pengembangan.

## Struktur Repo

```
coldtrack-ai/
  backend/     FastAPI (sinkron, tanpa database, tanpa background job)
  frontend/    Next.js 14
  ml/          Simulator data, notebook, dan ekspor model GRU ke ONNX
  docs/        Dataset card, model card, AI governance, feature schema, architecture
```

## Dokumentasi

- [Architecture](docs/architecture.md)
- [Feature Schema](docs/feature_schema.md)
- [Dataset Card](docs/dataset_card.md)
- [Model Card](docs/model_card.md)
- [AI Governance](docs/ai_governance.md)
