import { NextResponse } from 'next/server';

export async function GET() {
    // Simple graph data with a central hub node
    return NextResponse.json({
        nodes: [
        { id: 'hub', label: 'IntelliGraph', color: '#2563eb', val: 10 }
        ],
        links: []
    });
}