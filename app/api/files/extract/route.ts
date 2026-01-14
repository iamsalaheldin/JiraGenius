import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
// eslint-disable-next-line @typescript-eslint/no-require-imports -- pdf-extraction has no TypeScript types
const pdfExtraction = require("pdf-extraction");

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

interface ExtractedFile {
  filename: string;
  type: string;
  content: string;
  size: number;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const extractedFiles: ExtractedFile[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
          errors.push(`${file.name}: File size exceeds 10MB limit`);
          continue;
        }

        // Validate file type
        const fileType = file.type;
        const fileName = file.name.toLowerCase();
        const isValidType =
          Object.values(ALLOWED_TYPES).some((extensions) =>
            extensions.some((ext) => fileName.endsWith(ext))
          ) ||
          fileType in ALLOWED_TYPES ||
          fileName.endsWith(".pdf") ||
          fileName.endsWith(".docx") ||
          fileName.endsWith(".txt");

        if (!isValidType) {
          errors.push(
            `${file.name}: Invalid file type. Only PDF, DOCX, and TXT files are allowed.`
          );
          continue;
        }

        // Extract text based on file type
        let extractedText = "";
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (fileName.endsWith(".pdf")) {
          try {
            const result = await pdfExtraction(buffer);
            extractedText = result.text || "";
          } catch (pdfError) {
            errors.push(`${file.name}: Failed to extract text from PDF - ${pdfError instanceof Error ? pdfError.message : "Unknown error"}`);
            continue;
          }
        } else if (fileName.endsWith(".docx")) {
          try {
            const result = await mammoth.extractRawText({ arrayBuffer });
            extractedText = result.value;
          } catch (docxError) {
            errors.push(`${file.name}: Failed to extract text from DOCX - ${docxError instanceof Error ? docxError.message : "Unknown error"}`);
            continue;
          }
        } else if (fileName.endsWith(".txt")) {
          try {
            extractedText = buffer.toString("utf-8");
          } catch (txtError) {
            errors.push(`${file.name}: Failed to read TXT file - ${txtError instanceof Error ? txtError.message : "Unknown error"}`);
            continue;
          }
        }

        if (!extractedText.trim()) {
          errors.push(`${file.name}: No text content could be extracted from the file.`);
          continue;
        }

        extractedFiles.push({
          filename: file.name,
          type: file.type || "unknown",
          content: extractedText,
          size: file.size,
        });
      } catch (error) {
        errors.push(
          `${file.name}: ${error instanceof Error ? error.message : "Unknown error occurred"}`
        );
      }
    }

    if (extractedFiles.length === 0 && errors.length > 0) {
      return NextResponse.json(
        {
          error: "Failed to extract text from any files",
          details: errors,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      files: extractedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[API] File extraction error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

