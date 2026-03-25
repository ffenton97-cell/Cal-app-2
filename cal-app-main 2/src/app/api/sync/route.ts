import { NextResponse } from 'next/server'

const MSG =
  'Cloud sync is not configured for this deployment. On Vercel, wire @vercel/blob (or similar) or deploy the Netlify sync function with Blobs.'

export async function GET() {
  return NextResponse.json({ error: MSG }, { status: 501 })
}

export async function POST() {
  return NextResponse.json({ error: MSG }, { status: 501 })
}
