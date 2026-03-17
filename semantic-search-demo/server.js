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

// Expanded movie dataset to show the true power of semantic search
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
  { id: '10', title: 'Jurassic Park', description: 'A pragmatic paleontologist touring an almost complete theme park on an island in Central America is tasked with protecting a couple of kids after a power failure causes the park\'s cloned dinosaurs to run loose.' },
  { id: '11', title: 'The Truman Show', description: 'An insurance salesman discovers his whole life is actually a reality TV show.' },
  { id: '12', title: 'Good Will Hunting', description: 'Will Hunting, a janitor at M.I.T., has a gift for mathematics, but needs help from a psychologist to find direction in his life.' },
  { id: '13', title: 'Gladiator', description: 'A former Roman General sets out to exact vengeance against the corrupt emperor who murdered his family and sent him into slavery.' },
  { id: '14', title: 'The Silence of the Lambs', description: 'A young F.B.I. cadet must receive the help of an incarcerated and manipulative cannibal killer to help catch another serial killer.' },
  { id: '15', title: 'Wall-E', description: 'In the distant future, a small waste-collecting robot inadvertently embarks on a space journey that will ultimately decide the fate of mankind.' },
  { id: '16', title: 'The Lion King', description: 'Lion prince Simba and his father are targeted by his bitter uncle, who wants to ascend the throne himself.' },
  { id: '17', title: 'Back to the Future', description: 'A teenager is accidentally sent thirty years into the past in a time-traveling DeLorean invented by his close friend.' },
  { id: '18', title: 'The Terminator', description: 'A human soldier is sent from 2029 to 1984 to stop an almost indestructible cyborg killing machine, sent from the same year.' },
  { id: '19', title: 'Alien', description: 'The crew of a commercial spacecraft encounter a deadly lifeform after investigating an unknown transmission.' },
  { id: '20', title: 'Indiana Jones and the Raiders of the Lost Ark', description: 'In 1936, archaeologist and adventurer Indiana Jones is hired by the U.S. government to find the Ark of the Covenant before the Nazis.' },
  { id: '21', title: 'The Social Network', description: 'As Harvard student Mark Zuckerberg creates the social networking site that would become known as Facebook, he is sued by the twins who claimed he stole their idea.' },
  { id: '22', title: 'Whiplash', description: 'A promising young drummer enrolls at a cut-throat music conservatory where his dreams of greatness are mentored by an instructor who will stop at nothing to realize a student\'s potential.' },
  { id: '23', title: 'Blade Runner 2049', description: 'Young Blade Runner K\'s discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who\'s been missing for thirty years.' },
  { id: '24', title: 'Mad Max: Fury Road', description: 'In a post-apocalyptic wasteland, a woman rebels against a tyrannical ruler in search for her homeland with the aid of a group of female prisoners and a drifter named Max.' },
  { id: '25', title: 'Spider-Man: Into the Spider-Verse', description: 'Teen Miles Morales becomes the Spider-Man of his universe, and must join with five spider-powered individuals from other dimensions to stop a threat for all realities.' },
  { id: '26', title: 'The Grand Budapest Hotel', description: 'A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy in the hotel\'s glorious years.' },
  { id: '27', title: 'Parasite', description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.' },
  { id: '28', title: 'Coco', description: 'Aspiring musician Miguel, confronted with his family\'s ancestral ban on music, enters the Land of the Dead to find his great-great-grandfather, a legendary singer.' },
  { id: '29', title: 'Arrival', description: 'A linguist works with the military to communicate with alien lifeforms after twelve mysterious spacecraft appear around the world.' },
  { id: '30', title: 'The Martian', description: 'An astronaut becomes stranded on Mars after his team assume him dead, and must rely on his ingenuity to find a way to signal to Earth that he is alive.' }
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
