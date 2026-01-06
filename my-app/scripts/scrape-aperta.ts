// scripts/scrape-aperta.ts
import axios from 'axios';
import neo4j from 'neo4j-driver';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config(); // { path: '.env.local' } might be needed if running locally

// --- CONFIGURATION ---
const NEO4J_URI = process.env.NEO4J_URI || 'bolt://localhost:7687';
const NEO4J_USER = process.env.NEO4J_USER || 'neo4j';
const NEO4J_PASSWORD = process.env.NEO4J_PASSWORD || 'password';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

// AI and DB Connections
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
const driver = neo4j.driver(NEO4J_URI, neo4j.auth.basic(NEO4J_USER, NEO4J_PASSWORD));

// --- TYPE DEFINITIONS ---
interface ProjectData {
  title: string;
  description: string;
  date: string;
  url: string;
  authors: string[];
  keywords: string[];
}

// --- HELPER FUNCTIONS ---

// 1. Embedding Generator
async function getEmbedding(text: string): Promise<number[]> {
  try {
    // Truncate text if too long (to avoid token limits)
    const safeText = text.substring(0, 9000);
    const result = await embeddingModel.embedContent(safeText);
    return result.embedding.values;
  } catch (error) {
    console.error('Embedding Error:', error);
    return [];
  }
}

// 2. Data Fetching (Scraping/API Request)
async function scrapeAperta(): Promise<ProjectData[]> {
  const apiUrl = "https://aperta.ulakbim.gov.tr/api/records";
  console.log(`🌐 Fetching data: ${apiUrl}...`);

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      params: {
        sort: "mostrecent",
        size: 5, // How many records to fetch?
        // q: "subject:engineering" // Engineering filter (optional)
      },
      // If SSL errors need to be ignored (in Development environment):
      httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    if (!response.data.hits) {
      console.log("⚠️ Unexpected API response:", JSON.stringify(response.data).substring(0, 200));
    }

    const hits = response.data.hits?.hits || [];
    console.log(`🔍 API returned ${hits.length} raw records.`);
    
    const projects: ProjectData[] = [];

    for (const item of hits) {
      const metadata = item.metadata;
      
      // Get authors
      const authors = metadata.creators?.map((c: any) => c.name) || ['Unknown Author'];

      // Extract Keywords/Subjects
      const keywords: string[] = [];
      if (metadata.subjects) {
          metadata.subjects.forEach((subj: any) => {
              if (subj.term) keywords.push(subj.term);
          });
      }

      projects.push({
        title: metadata.title || 'Untitled',
        description: metadata.description || 'No description.',
        date: metadata.publication_date || new Date().toISOString().split('T')[0],
        url: item.links?.html || '',
        authors: authors,
        keywords: keywords
      });
    }

    return projects;

  } catch (error) {
    console.error("❌ Could not access site:", error);
    return [];
  }
}

// 3. Save to Neo4j
async function saveToNeo4j(project: ProjectData) {
  const session = driver.session();
  try {
    // CHECK: Does project already exist?
    const checkQuery = `
      MATCH (p:Project {website: $url})
      RETURN p.projectId AS id
    `;
    const checkResult = await session.run(checkQuery, { url: project.url });
    
    if (checkResult.records.length > 0) {
      console.log(`⏭️  Skipping (Already exists): ${project.title.substring(0, 30)}...`);
      return;
    }

    console.log(`🧠 Generating embedding: ${project.title.substring(0, 30)}...`);
    const vector = await getEmbedding(`${project.title} ${project.description}`);

    if (vector.length === 0) {
      console.log("⚠️ Vector empty, skipping.");
      return;
    }

    const query = `
      // Create Project
      MERGE (p:Project {title: $title})
      ON CREATE SET 
        p.projectId = randomUUID(),
        p.summary = $description,  // Using 'summary' as per project schema
        p.status = 'Completed',    // Published article is completed
        
        // Fill Dates
        p.startDate = $date,       // Treat publication date as start date
        p.endDate = $date,         // Treat publication date as end date
        p.createdAt = datetime($date),
        
        p.website = $url,          // Using 'website' as per project schema
        p.embedding = $vector,
        p.isScraped = true,        // This is bot data
        
        p.keywords = $keywords,
        p.budget = null            // Scraped data usually doesn't have budget

      // Create Authors (Academics)
      WITH p
      UNWIND $authors AS authorName
      
      MERGE (a:Academic {name: authorName})
      ON CREATE SET
        a.userId = randomUUID(),
        // Create unique ghost email: "Ahmet Yılmaz" -> "ahmet.yilmaz@aperta.scraped"
        a.email = toLower(replace(authorName, ' ', '.')) + '@aperta.scraped',
        a.role = 'ACADEMIC',
        a.isRegistered = false,
        a.source = 'APERTA',
        a.createdAt = datetime()

      // Establish Relationship
      MERGE (a)-[:IS_AUTHOR_OF {role: 'Author'}]->(p)
    `;

    await session.run(query, {
      title: project.title,
      description: project.description,
      date: project.date,
      url: project.url,
      vector: vector,
      authors: project.authors,
      keywords: project.keywords
    });

    console.log(`✅ Saved: ${project.title}`);

  } catch (error) {
    console.error(`❌ DB Error (${project.title}):`, error);
  } finally {
    await session.close();
  }
}

// --- MAIN FLOW ---
async function main() {
  console.log("🚀 Starting Aperta Bot...");
  
  const projects = await scrapeAperta();
  console.log(`📊 Found ${projects.length} projects. Processing...`);

  for (const project of projects) {
    await saveToNeo4j(project);
    // Wait 1 sec to avoid API rate limits
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log("🏁 All operations completed.");
  await driver.close();
}

// Run script
main();

//npx tsx scripts/scrape-aperta.ts