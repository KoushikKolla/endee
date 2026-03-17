import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { pipeline } from '@xenova/transformers';
import { Endee, Precision } from 'endee';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const client = new Endee();
client.setBaseUrl('http://127.0.0.1:8080/api/v1'); // Default local Endee server docker port

const INDEX_NAME = 'movie_semantic_search';
const DIMENSION = 384; 

let index = null;
let embedder = null;

// Initial movie dataset
const MOVIES = [
  { id: '1', title: 'The Matrix', description: 'A computer hacker learns from mysterious rebels about the true nature of his reality.' },
  { id: '2', title: 'Inception', description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.' },
  { id: '3', title: 'Interstellar', description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.' },
  { id: '4', title: 'The Dark Knight', description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.' },
  { id: '5', title: 'Fight Club', description: 'An insomniac office worker and a devil-may-care soap maker form an underground fight club that evolves into much more.' },
  { id: '6', title: 'Forrest Gump', description: 'The presidencies of Kennedy and Johnson, the Vietnam War, the Watergate scandal and other historical events unfold from the perspective of an Alabama man with an IQ of 75.' },
  { id: '7', title: 'Spirited Away', description: 'During her family\'s move to the suburbs, a sullen 10-year-old girl wanders into a world ruled by gods, witches, and spirits, and where humans are changed into beasts.' },
  { id: '8', title: 'The Lord of the Rings', description: 'A meek Hobbit from the Shire and eight companions set out on a journey to destroy the powerful One Ring and save Middle-earth from the Dark Lord Sauron.' },
  { id: '9', title: 'Star Wars: A New Hope', description: 'Luke Skywalker joins forces with a Jedi Knight, a cocky pilot, a Wookiee and two droids to save the galaxy from the Empire\'s world-destroying battle station.' },
  { id: '10', title: 'Jurassic Park', description: 'A pragmatic paleontologist touring an almost complete theme park on an island in Central America is tasked with protecting a couple of kids after a power failure causes the park\'s cloned dinosaurs to run loose.' }
];

async function initializeApp() {
  try {
    console.log('🔄 Loading Xenova/all-MiniLM-L6-v2 ...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('✅ Model Loaded!');

    console.log(`🔄 Checking Endee vector database for index '${INDEX_NAME}'...`);
    try {
      index = await client.getIndex(INDEX_NAME);
      console.log(`✅ Index '${INDEX_NAME}' already exists!`);
    } catch (err) {
      console.log(`⚠️ Index not found. Creating '${INDEX_NAME}'...`);
      await client.createIndex({
        name: INDEX_NAME,
        dimension: DIMENSION,
        spaceType: 'cosine',
        precision: Precision.FP32,
      });
      index = await client.getIndex(INDEX_NAME);
      console.log(`✅ Index '${INDEX_NAME}' created!`);

      // Seed the database
      console.log('🔄 Calculating embeddings for initial movies dataset...');
      const vectors = [];
      for (const movie of MOVIES) {
        const textToEmbed = `${movie.title}: ${movie.description}`;
        const output = await embedder(textToEmbed, { pooling: 'mean', normalize: true });
        const vectorArray = Array.from(output.data);
        vectors.push({
          id: movie.id,
          vector: vectorArray,
          meta: { title: movie.title, description: movie.description }
        });
      }
      
      console.log('🔄 Storing embeddings in Endee...');
      await index.upsert(vectors);
      console.log('✅ Initial dataset successfully stored!');
    }
  } catch (err) {
    console.error('❌ Error during initialization:', err);
    console.log('👉 Make sure Endee vector database is running on localhost:8080 or update the url.');
  }
}

// Endpoint to execute search
app.post('/api/search', async (req, res) => {
  if (!embedder || !index) {
    return res.status(503).json({ error: 'System not fully initialized yet. Try again later.' });
  }

  const { query, k = 3 } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required.' });
  }

  try {
    // Generate embedding for query
    const output = await embedder(query, { pooling: 'mean', normalize: true });
    const queryVector = Array.from(output.data);

    // Search in vector DB
    const results = await index.query({
      vector: queryVector,
      topK: k
    });

    res.json({ results });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'An error occurred while searching.' });
  }
});

// Endpoint to append new data
app.post('/api/add', async (req, res) => {
  if (!embedder || !index) {
    return res.status(503).json({ error: 'System not fully initialized yet. Try again later.' });
  }

  const { id, title, description } = req.body;
  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required.' });
  }

  const newId = id || `custom-${Date.now()}`;
  try {
    const textToEmbed = `${title}: ${description}`;
    const output = await embedder(textToEmbed, { pooling: 'mean', normalize: true });
    const vectorArray = Array.from(output.data);

    await index.upsert([{
      id: newId,
      vector: vectorArray,
      meta: { title, description }
    }]);

    res.json({ success: true, id: newId });
  } catch (err) {
    console.error('Add data error:', err);
    res.status(500).json({ error: 'An error occurred while adding data to Endee.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log(`🚀 Semantic Search Server running on http://localhost:${PORT}`);
  // Run background initialized
  initializeApp();
});
