# Architecture — ColdTrack AI

## Overview
<!-- Diagram/penjelasan alur: sensor/simulator -> preprocessing -> model ONNX -> FastAPI -> Next.js UI -->

## Components
- **backend/** — FastAPI, sinkron, tanpa database, tanpa background job
- **frontend/** — Next.js 14
- **ml/** — simulator data, notebook eksperimen, ekspor model ke ONNX

## Constraints
- Tanpa database
- Tanpa background job
- Backend sinkron saja
- Harus bisa dijalankan penuh via `docker compose up`

## Data Flow
<!-- Jelaskan alur request/response end-to-end -->
