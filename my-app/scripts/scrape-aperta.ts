// scripts/scrape-aperta.ts
import axios from 'axios';
import neo4j from 'neo4j-driver';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as dotenv from 'dotenv';

// Load .env file
dotenv.config({ path: '.env.local' });

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
async function scrapeAperta(page: number, size: number): Promise<ProjectData[]> {
  const apiUrl = "https://aperta.ulakbim.gov.tr/api/records";
  console.log(`🌐 Fetching data page ${page}...`);

  try {
    const response = await axios.get(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      },
      params: {
        sort: "mostrecent",
        size: size, 
        page: page 
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
    
    // DEBUG LOGGING - Inspect the first record
    if (hits.length > 0) {
      console.log('--- DEBUG: First Record Structure ---');
      const firstHit = hits[0];
      console.log('Links:', JSON.stringify(firstHit.links, null, 2));
      console.log('Metadata Keys:', Object.keys(firstHit.metadata));
      if (firstHit.metadata.subjects) {
         console.log('Subjects:', JSON.stringify(firstHit.metadata.subjects, null, 2));
      } else {
         console.log('Numbers of Subjects: None');
      }
      
      // Check for your custom branches
      if (firstHit.metadata.custom && firstHit.metadata.custom["aperta:science_branches"]) {
          console.log('Science Branches:', JSON.stringify(firstHit.metadata.custom["aperta:science_branches"], null, 2));
      }
      console.log('--------------------------------------');
    }
    
    const projects: ProjectData[] = [];

    for (const item of hits) {
      const metadata = item.metadata;
      
      // Get authors and format them from "Surname, Name" to "Name Surname"
      const authors = metadata.creators?.map((c: any) => {
        if (c.name && c.name.includes(',')) {
          const parts = c.name.split(',').map((p: string) => p.trim());
          if (parts.length >= 2) {
             // parts[0] is Surname, parts[1] is Name. We want "Name Surname"
             return `${parts[1]} ${parts[0]}`;
          }
        }
        return c.name;
      }) || ['Unknown Author'];

      // Extract Keywords/Subjects
      // Attempt 1: Standard 'subjects' field
      const keywords: string[] = [];
      if (metadata.subjects) {
          metadata.subjects.forEach((subj: any) => {
              if (subj.term) keywords.push(subj.term);
          });
      }
      
      // Attempt 2: Custom 'aperta:science_branches' field
      if (metadata.custom && metadata.custom["aperta:science_branches"]) {
         metadata.custom["aperta:science_branches"].forEach((branch: any) => {
            // Pick title language preference: EN -> TR
            let rawTitle = '';
            if (branch.title) {
               if (branch.title.tr) rawTitle = branch.title.en;
               else if (branch.title.en) rawTitle = branch.title.tr;
            }

            if (rawTitle) {
               // Split by '>' if it represents a hierarchy (e.g. "Basic Sciences > Life Sciences")
               if (rawTitle.includes('>')) {
                 const parts = rawTitle.split('>').map((p: string) => p.trim());
                 // Add each part as a separate keyword or just the last specific part?
                 // Let's add ALL parts as separate keywords for better searchability.
                 parts.forEach((p: string) => {
                    if (!keywords.includes(p)) keywords.push(p);
                 });
               } else {
                 if (!keywords.includes(rawTitle)) keywords.push(rawTitle);
               }
            }
         });
      }

      projects.push({
        title: metadata.title || 'Untitled',
        description: metadata.description || 'No description.',
        date: metadata.publication_date || new Date().toISOString().split('T')[0],
        // Log confirms 'self_html' is the correct key, not 'html'
        // Links: { "self_html": "https://aperta.ulakbim.gov.tr/records/286675", ... }
        url: item.links?.self_html || item.links?.html || '', 
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
async function saveToNeo4j(project: ProjectData): Promise<boolean> {
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
      return false; // Indicating it was skipped
    }

    console.log(`🧠 Generating embedding: ${project.title.substring(0, 30)}...`);
    const vector = await getEmbedding(`${project.title} ${project.description}`);

    if (vector.length === 0) {
      console.log("⚠️ Vector empty, skipping.");
      return false;
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
    return true; // Indicating success

  } catch (error) {
    console.error(`❌ DB Error (${project.title}):`, error);
    return false;
  } finally {
    await session.close();
  }
}

// --- MAIN FLOW ---
async function main() {
  console.log("🚀 Starting Aperta Bot...");
  
  const TARGET_COUNT = 5; // How many NEW projects we want to add
  let addedCount = 0;
  let currentPage = 1;
  const BATCH_SIZE = 10; // How many to fetch per request

  while (addedCount < TARGET_COUNT) {
      const projects = await scrapeAperta(currentPage, BATCH_SIZE);
      
      if (projects.length === 0) {
          console.log("⚠️ No more projects returned from API.");
          break;
      }

      console.log(`📊 Processing page ${currentPage} (${projects.length} items)...`);

      for (const project of projects) {
          if (addedCount >= TARGET_COUNT) break;

          const saved = await saveToNeo4j(project);
          if (saved) {
              addedCount++;
          }
           // RATE LIMIT PROTECTION (Free Tier: 15 RPM -> 1 request every 4 seconds)
           // We set 4500ms to be safe.
           console.log("⏳ Cooling down for 4.5s (API Rate Limit)...");
           await new Promise(resolve => setTimeout(resolve, 4500));
      }
      
      currentPage++;
      // Wait 1 sec before next API call
      await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`🏁 Operation completed. Added ${addedCount} new projects.`);
  await driver.close();
}

// Run script
main();

//npx tsx scripts/scrape-aperta.ts