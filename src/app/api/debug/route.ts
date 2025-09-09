import { NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'missing-persons.csv')
    
    // Check if file exists and get stats
    try {
      const stats = await fs.stat(csvPath)
      
      // Read first few lines
      const content = await fs.readFile(csvPath, 'utf-8')
      const lines = content.split('\n').slice(0, 3)
      
      return NextResponse.json({
        csvExists: true,
        fileSize: stats.size,
        firstLines: lines,
        workingDirectory: process.cwd()
      })
    } catch (error) {
      return NextResponse.json({
        csvExists: false,
        error: error.message,
        workingDirectory: process.cwd()
      })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}