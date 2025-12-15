import { NextResponse } from 'next/server';
import driver from '@/lib/neo4j';
import { Session } from 'neo4j-driver';

export async function GET() {
  let session: Session | null = null;

  try {
    session = driver.session();

    // DATA FETCHING
    // All relationships of type IS_AUTHOR_OF, REPRESENTS, OPENS_CALL, CREATED_CALL
    const result = await session.run(
      `
      MATCH (source)-[r]->(target)
      WHERE type(r) IN ['IS_AUTHOR_OF', 'REPRESENTS', 'OPENS_CALL', 'CREATED_CALL']
      RETURN source, type(r) AS relType, target
      LIMIT 150
      `
    );

    // DATA PROCESSING (Nodes & Links)
    const nodesMap = new Map();
    const links: any[] = [];

    // Helper: Node Type, Color, and Label
    const getNodeInfo = (node: any) => {
      const labels = node.labels;
      const props = node.properties;
      
      let group = 'Unknown';
      let label = 'Unknown';
      let color = '#9ca3af'; // Gray (Default)
      let id = '';
      let val = 1; // Node Size

      // Academic (Mehmet): Purple/Lilac
      // Project (Artificial...): Turquoise/Blue
      // Institution (Gebze...): Brownish
      // Call (AI Research...): Yellow

      if (labels.includes('Academic')) {
        group = 'Academic';
        label = props.name;
        color = '#a5b4fc';
        id = props.userId;
        val = 10;
      } 
      else if (labels.includes('Project')) {
        group = 'Project';
        label = props.title.length > 20 ? props.title.substring(0, 20) + '...' : props.title;
        color = '#22d3ee';
        id = props.projectId;
        val = 7;
      } 
      else if (labels.includes('Call')) {
        group = 'Call';
        label = props.title.length > 20 ? props.title.substring(0, 20) + '...' : props.title;
        color = '#fcd34d';
        id = props.callId;
        val = 8;
      } 
      else if (labels.includes('Institution')) {
        group = 'Institution';
        label = props.name;
        color = '#a1887f';
        id = props.institutionId || props.name;
        val = 9;
      }

      // Fallback ID
      if (!id) id = Math.random().toString(36);

      return { id, label, group, color, val };
    };

    // Process Records
    result.records.forEach((record) => {
      const sourceNode = record.get('source');
      const targetNode = record.get('target');
      const relType = record.get('relType');

      // Get Node Info
      const sourceInfo = getNodeInfo(sourceNode);
      const targetInfo = getNodeInfo(targetNode);

      // Add Nodes to Map (Prevent Duplicates)
      if (!nodesMap.has(sourceInfo.id)) {
        nodesMap.set(sourceInfo.id, sourceInfo);
      }
      if (!nodesMap.has(targetInfo.id)) {
        nodesMap.set(targetInfo.id, targetInfo);
      }

      // Add Link
      links.push({
        source: sourceInfo.id,
        target: targetInfo.id,
        label: relType // Label on the arrow
      });
    });

    // Convert Map to Array
    const nodes = Array.from(nodesMap.values());

    return NextResponse.json({ nodes, links }, { status: 200 });

  } catch (error) {
    console.error('Graph API Error:', error);
    return NextResponse.json({ message: 'Server error', nodes: [], links: [] }, { status: 500 });
  } finally {
    if (session) await session.close();
  }
}