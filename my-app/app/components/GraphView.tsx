'use client';

import { useRef } from 'react';
import dynamic from 'next/dynamic';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

interface GraphViewProps {
  graphData: { nodes: any[]; links: any[] };
  loading: boolean;
}

export default function GraphView({ graphData, loading }: GraphViewProps) {
  const fgRef = useRef<any>(null);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm h-[600px] flex flex-col">
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4 pl-4 pt-4">
        Project Network Graph
      </h3>
      
      <div className="flex-1 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden relative bg-gray-50 dark:bg-gray-900">
         {graphData.nodes.length > 0 ? (
           <ForceGraph2D
              ref={fgRef}
              graphData={graphData}
              
              // NODE AND LABEL RENDERING
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.label;
                
                // Font size constant
                const fontSize = 4; 
                
                // Node radius proportional to value
                const radius = Math.max(node.val * 1.5, 8); 

                // Draw circle
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
                ctx.fillStyle = node.color;
                ctx.fill();
                
                // Draw circle border
                ctx.lineWidth = 0.5;
                ctx.strokeStyle = '#fff';
                ctx.stroke();
                
                // Draw text
                // PERFORMANCE TUNING: If we are too far away (globalScale < 1.5), do not draw the text at all.
                if (globalScale > 1.2) {
                    ctx.font = `bold ${fontSize}px Sans-Serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = '#1f2937';
                    
                    // shorten label if too long
                    const displayLabel = label.length > 12 ? label.substring(0, 12) + '.' : label;
                    
                    ctx.fillText(displayLabel, node.x, node.y);
                }
              }}
              nodeLabel={(node: any) => node.label}

              // LINK RENDERING
              linkCanvasObject={(link: any, ctx, globalScale) => {
                const start = link.source;
                const end = link.target;

                // line width and style
                ctx.lineWidth = 1; 
                ctx.strokeStyle = '#9ca3af';
                ctx.beginPath();
                ctx.moveTo(start.x, start.y);
                ctx.lineTo(end.x, end.y);
                ctx.stroke();

                // Relationship label (Only visible when zoomed in closely)
                if (link.label && globalScale > 2) {
                  const textPos = { x: start.x + (end.x - start.x) / 2, y: start.y + (end.y - start.y) / 2 };
                  const fontSize = 3;
                  
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.fillStyle = '#6b7280';
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillText(link.label, textPos.x, textPos.y);
                }
              }}
              // Arrow settings
              linkCanvasObjectMode={() => 'after'} 
              linkDirectionalArrowLength={3.5}
              linkDirectionalArrowRelPos={1}

              // PHYSICS AND INTERACTION
              onEngineStop={() => fgRef.current?.zoomToFit(400, 50)}
              cooldownTicks={100}
              d3VelocityDecay={0.3}
              
              onEngineTick={() => {
                 if (fgRef.current) {
                   fgRef.current.d3Force('charge').strength(-40); 
                   fgRef.current.d3Force('link').distance(50);     
                   fgRef.current.d3Force('center').strength(0.05);
                 }
              }}

              backgroundColor="rgba(0,0,0,0)" 
           />
         ) : (
           <div className="flex items-center justify-center h-full text-gray-500">
              {loading ? 'Loading Graph Data...' : 'No graph data available.'}
           </div>
         )}
         
         <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-gray-800/90 p-3 rounded-lg shadow-lg text-xs backdrop-blur-sm z-10 border border-gray-200 dark:border-gray-700">
            <div className="font-bold mb-2 dark:text-white border-b pb-1 dark:border-gray-600">Legend</div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-[#a5b4fc]"></span> <span className="text-gray-700 dark:text-gray-300">Researcher</span></div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-[#22d3ee]"></span> <span className="text-gray-700 dark:text-gray-300">Project</span></div>
            <div className="flex items-center gap-2 mb-1"><span className="w-3 h-3 rounded-full bg-[#fcd34d]"></span> <span className="text-gray-700 dark:text-gray-300">Call</span></div>
            <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#a1887f]"></span> <span className="text-gray-700 dark:text-gray-300">Institution</span></div>
         </div>
      </div>
    </div>
  );
}
