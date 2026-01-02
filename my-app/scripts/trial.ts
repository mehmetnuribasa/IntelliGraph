import axios from 'axios';
import { parseStringPromise } from 'xml2js';

export interface OAIRecord {
  identifier: string;
  title: string;
  creators: string[];
  abstract?: string;
  date?: string;
  subjects?: string[];
  doi?: string;
  url?: string;
  language?: string;
  type?: string;
  publisher?: string;
}

export interface OAIResponse {
  records: OAIRecord[];
  resumptionToken?: string;
  totalRecords?: number;
}

/**
 * OAI-PMH (Open Archives Initiative Protocol for Metadata Harvesting) Client
 * Used to fetch metadata from academic repositories like Aperta and HARMAN
 */
class OAIPMHClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  /**
   * List all available metadata formats
   */
  async listMetadataFormats(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}?verb=ListMetadataFormats`;
      const response = await axios.get(url);
      const result = await parseStringPromise(response.data);

      const formats =
        result['OAI-PMH']?.ListMetadataFormats?.[0]?.metadataFormat || [];
      return formats.map(
        (format: any) => format.metadataPrefix?.[0] || ''
      );
    } catch (error) {
      console.error('Error listing metadata formats:', error);
      return [];
    }
  }

  /**
   * List all available sets (collections)
   */
  async listSets(): Promise<{ spec: string; name: string }[]> {
    try {
      const url = `${this.baseUrl}?verb=ListSets`;
      const response = await axios.get(url);
      const result = await parseStringPromise(response.data);

      const sets = result['OAI-PMH']?.ListSets?.[0]?.set || [];
      return sets.map((set: any) => ({
        spec: set.setSpec?.[0] || '',
        name: set.setName?.[0] || '',
      }));
    } catch (error) {
      console.error('Error listing sets:', error);
      return [];
    }
  }

  /**
   * Harvest records from the repository
   */
  async listRecords(
    metadataPrefix: string = 'oai_dc',
    set?: string,
    from?: string,
    until?: string,
    resumptionToken?: string
  ): Promise<OAIResponse> {
    try {
      let url = `${this.baseUrl}?verb=ListRecords`;

      if (resumptionToken) {
        url += `&resumptionToken=${encodeURIComponent(resumptionToken)}`;
      } else {
        url += `&metadataPrefix=${metadataPrefix}`;
        if (set) url += `&set=${encodeURIComponent(set)}`;
        if (from) url += `&from=${from}`;
        if (until) url += `&until=${until}`;
      }

      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Turkish-Academic-Search/1.0',
        },
      });
      const result = await parseStringPromise(response.data);

      // Check for OAI-PMH errors
      const oaiError = result['OAI-PMH']?.error?.[0];
      if (oaiError) {
        const errorCode = oaiError.$.code || 'unknown';
        const errorMsg = oaiError._ || 'Unknown error';
        console.error(`OAI-PMH Error [${errorCode}]: ${errorMsg}`);
        return { records: [] };
      }

      const records = result['OAI-PMH']?.ListRecords?.[0]?.record || [];
      const newResumptionToken =
        result['OAI-PMH']?.ListRecords?.[0]?.resumptionToken?.[0]?._ || '';

      const parsedRecords = records
        .map((record: any) => this.parseRecord(record))
        .filter((r: OAIRecord | null) => r !== null) as OAIRecord[];

      return {
        records: parsedRecords,
        resumptionToken: newResumptionToken,
      };
    } catch (error: any) {
      const errorDetails = error.response?.status 
        ? `HTTP ${error.response.status}: ${error.response.statusText}` 
        : error.message;
      console.error(`Error listing records from ${this.baseUrl}: ${errorDetails}`);
      return { records: [] };
    }
  }

  /**
   * Get a single record by identifier
   */
  async getRecord(
    identifier: string,
    metadataPrefix: string = 'oai_dc'
  ): Promise<OAIRecord | null> {
    try {
      const url = `${this.baseUrl}?verb=GetRecord&identifier=${encodeURIComponent(
        identifier
      )}&metadataPrefix=${metadataPrefix}`;

      const response = await axios.get(url);
      const result = await parseStringPromise(response.data);

      const record = result['OAI-PMH']?.GetRecord?.[0]?.record?.[0];
      if (!record) return null;

      return this.parseRecord(record);
    } catch (error) {
      console.error('Error getting record:', error);
      return null;
    }
  }

  /**
   * Parse an OAI record to our format
   */
  private parseRecord(record: any): OAIRecord | null {
    try {
      const header = record.header?.[0];
      const metadata = record.metadata?.[0];
      const dc = metadata?.['oai_dc:dc']?.[0] || metadata?.dc?.[0];

      if (!dc) return null;

      const identifier = header?.identifier?.[0] || '';
      const title = this.extractFirst(dc['dc:title'] || dc.title);
      const creators = this.extractAll(dc['dc:creator'] || dc.creator);
      const abstract = this.extractFirst(
        dc['dc:description'] || dc.description
      );
      const date = this.extractFirst(dc['dc:date'] || dc.date);
      const subjects = this.extractAll(dc['dc:subject'] || dc.subject);
      const identifiers = this.extractAll(
        dc['dc:identifier'] || dc.identifier
      );
      const language = this.extractFirst(dc['dc:language'] || dc.language);
      const type = this.extractFirst(dc['dc:type'] || dc.type);
      const publisher = this.extractFirst(dc['dc:publisher'] || dc.publisher);

      // Extract DOI and URL from identifiers
      let doi: string | undefined;
      let url: string | undefined;

      for (const id of identifiers) {
        if (id.includes('doi.org') || id.startsWith('10.')) {
          doi = id.replace(/^.*?(10\.\d+\/.+)$/, '$1');
        } else if (id.startsWith('http://') || id.startsWith('https://')) {
          url = id;
        }
      }

      return {
        identifier,
        title,
        creators,
        abstract,
        date,
        subjects,
        doi,
        url,
        language,
        type,
        publisher,
      };
    } catch (error) {
      console.error('Error parsing record:', error);
      return null;
    }
  }

  private extractFirst(field: any): string {
    if (!field) return '';
    if (Array.isArray(field)) {
      return field[0] || '';
    }
    return field;
  }

  private extractAll(field: any): string[] {
    if (!field) return [];
    if (Array.isArray(field)) {
      return field;
    }
    return [field];
  }
}

export default OAIPMHClient;