import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const DATA_FILE = path.join(process.cwd(), "data", "waitlist.json");

interface WaitlistEntry {
  email: string;
  timestamp: string;
  source: string;
}

interface WaitlistData {
  entries: WaitlistEntry[];
}

function ensureDataFile(): WaitlistData {
  const dataDir = path.dirname(DATA_FILE);

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create file if it doesn't exist
  if (!fs.existsSync(DATA_FILE)) {
    const initialData: WaitlistData = { entries: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }

  // Read existing data
  try {
    const content = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(content) as WaitlistData;
  } catch {
    // If file is corrupted, reinitialize
    const initialData: WaitlistData = { entries: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

function saveData(data: WaitlistData): void {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// GET: Return waitlist count
export async function GET() {
  try {
    const data = ensureDataFile();
    return NextResponse.json({ count: data.entries.length });
  } catch (error) {
    console.error("Error reading waitlist:", error);
    return NextResponse.json({ count: 0 });
  }
}

// POST: Add email to waitlist
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== "string" || !emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    // Normalize email
    const normalizedEmail = email.toLowerCase().trim();

    // Load existing data
    const data = ensureDataFile();

    // Check for duplicates
    const exists = data.entries.some(
      (entry) => entry.email.toLowerCase() === normalizedEmail
    );

    if (exists) {
      return NextResponse.json(
        { message: "You're already on the waitlist!", alreadyExists: true },
        { status: 200 }
      );
    }

    // Add new entry
    const newEntry: WaitlistEntry = {
      email: normalizedEmail,
      timestamp: new Date().toISOString(),
      source: "quantum-shield",
    };

    data.entries.push(newEntry);
    saveData(data);

    return NextResponse.json(
      {
        message: "You're on the list! We'll notify you when SDKs are ready.",
        count: data.entries.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding to waitlist:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
