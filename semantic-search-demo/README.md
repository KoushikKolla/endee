# Endee Semantic Search Demo

This project is an AI/ML application demonstrating **Semantic Search** using the [Endee Vector Database](https://github.com/endee-io/endee). It processes text into dense vector embeddings using a local ML model and uses Endee for fast, filtered similarity retrieval. 

This repository was built as an assignment submission for **Tap Academy / Endee.io**.

## Project Overview

Traditional keyword-search relies on exact word matches (e.g. searching "space adventure" will only yield documents with those exact words). **Semantic Search**, on the other hand, understands the *context* and *meaning* of the words.

This application uses the `Xenova/all-MiniLM-L6-v2` embedding model to encode movie synopses into dense feature vectors (384 dimensions) and stores them in **Endee**. When a user types a query like *"I want to watch a space adventure..."*, the system encodes the query and performs a nearest-neighbor Search (K-NN) against the vector database to return the most contextually relevant movies (e.g. *Interstellar* or *Star Wars*).

### Key Features
- **Local Embedding Generation:** Complete privacy with on-device embedding generation using `@xenova/transformers`.
- **High-Performance Retrieval:** Leverages **Endee** as the fast, core vector storage backend.
- **Modern UI:** A clean, glassmorphic UI built with HTML/CSS/JS and smooth micro-animations.

## System Design

The application follows a lightweight client-server architecture:

1. **Frontend (UI)**: Built with Vanilla HTML/CSS/JS. It captures user input and visually displays the search results.
2. **Backend Engine (Node.js/Express)**: 
   - Exposes a REST API (`/api/search`).
   - Uses `@xenova/transformers` to instantiate an embedding pipeline (`all-MiniLM-L6-v2`) in-memory.
   - Manages connections to the local Endee database via the official `endee` Node.js package.
3. **Vector Database (Endee)**: Hosted locally via Docker. Acts as the system of record for vectors and handles similarity math seamlessly.

```mermaid
graph LR
A[Client UI] -- Search Query --> B(Express Backend)
B -- 1. Text to Vector --> C[@xenova/transformers]
B -- 2. K-NN Similarity Search --> D[Endee Vector DB]
D -- Results --> B
B -- Semantic Matches --> A
```

## Setup Instructions

### Prerequisites
1. [Node.js](https://nodejs.org/) (v18+)
2. [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Required to run Endee locally)

### Step 1: Start Endee Database
Pull and run the official Endee server image via Docker. Open a terminal and execute:
```bash
docker run \
  --ulimit nofile=100000:100000 \
  -p 8080:8080 \
  -v ./endee-data:/data \
  --name endee-server \
  --restart unless-stopped \
  endeeio/endee-server:latest
```
Wait a few seconds for the database to boot up. It will be accessible at `http://localhost:8080`.

### Step 2: Install App Dependencies
Navigate to the root of this project repository:
```bash
cd semantic-search-demo
npm install
```

### Step 3: Run the Application
Start the Node.js backend server:
```bash
npm start
```
*Note: Upon first launch, the server will download the ML model weights (~90MB) and encode the initial movie dataset to populate the Endee database.*

### Step 4: Access the UI
Open your browser and navigate to:
**http://localhost:3000**

Try querying something abstract like:
- *"dreams within dreams"* -> *(Inception)*
- *"dinosaurs running loose"* -> *(Jurassic Park)*

## Use of Endee Database
The project utilizes the `endee` Javascript/TypeScript SDK for interacting with the database over HTTP. The backend explicitly calls:
- `client.createIndex(...)`: To initialize a collection (`384` dimensions, `cosine` spaceType, FP32).
- `index.upsert(...)`: To write vector outputs along with rich metadata tags so that the frontend can read the movie titles/descriptions back easily.
- `index.query(...)`: For the core retrieval loop.
