import { NextResponse } from 'next/server';

/**
 * Remote Log Relay
 * 
 * Receives logs from mobile devices and prints them to the server terminal.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { m, d, t } = body;
    
    // Format: [TIME] MESSAGE { DATA }
    const timestamp = new Date(t).toLocaleTimeString();
    console.log(`\x1b[35m[REMOTE IPHONE LOG]\x1b[0m \x1b[36m${timestamp}\x1b[0m \x1b[1m${m}\x1b[0m`, d || '');
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
