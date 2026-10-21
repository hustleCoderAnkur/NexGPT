
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import { PDFParse } from "pdf-parse";
import { getData } from "pdf-parse/worker";

const MAX_EXTRACTED_TEXT_LENGTH = 2_000_000;

const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "csv", "tsv",
  "json", "jsonl", "xml", "yaml", "yml",
  "html", "htm", "log", "js", "jsx",
  "ts", "tsx", "py", "java", "c", "h",
  "cpp", "hpp", "cs", "go", "rs", "php",
  "rb", "swift", "kt", "sql", "sh",
  "css", "scss", "sass", "less", "toml",
  "ini", "prisma", "graphql", "gql",
]);

function getExtension(filename: string): string {
  const safeName = filename.replace(/[\\/]/g, "_");
  const index = safeName.lastIndexOf(".");

  return index > 0 && index < safeName.length - 1
    ? safeName.slice(index + 1).toLowerCase()
    : "";
}

function validateExtractedText(text: string): string {
  const normalized = text.trim();

  if (!normalized) {
    throw new Error(
      "No readable text could be extracted. The file may be empty, scanned, encrypted, or unsupported.",
    );
  }

  if (normalized.length > MAX_EXTRACTED_TEXT_LENGTH) {
    throw new Error(
      "Extracted text exceeds the 2 MB processing limit.",
    );
  }

  return normalized;
}

async function parsePdf(file: File): Promise<string> {
  // Configure the worker supplied by pdf-parse v2.
  PDFParse.setWorker(getData());

  const parser = new PDFParse({
    data: new Uint8Array(await file.arrayBuffer()),
    useWorkerFetch: false,
    isEvalSupported: false,
  });

  try {
    const result = await parser.getText();
    return validateExtractedText(result.text);
  } finally {
    await parser.destroy();
  }
}

async function parseDocx(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await mammoth.extractRawText({ buffer });

  return validateExtractedText(result.value);
}

async function parseSpreadsheet(file: File): Promise<string> {
  const workbook = XLSX.read(
    await file.arrayBuffer(),
    { type: "array" },
  );

  const sections = workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];

    if (!sheet) {
      return "";
    }

    return `Sheet: ${sheetName}\n${XLSX.utils.sheet_to_csv(sheet)}`;
  });

  return validateExtractedText(sections.join("\n\n"));
}

export async function parseDocument(file: File): Promise<string> {
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("The uploaded file is empty or invalid.");
  }

  const extension = getExtension(file.name);

  try {
    if (TEXT_EXTENSIONS.has(extension)) {
      return validateExtractedText(await file.text());
    }

    if (extension === "pdf") {
      return await parsePdf(file);
    }

    if (extension === "docx") {
      return await parseDocx(file);
    }

    if (["xlsx", "xls"].includes(extension)) {
      return await parseSpreadsheet(file);
    }

    throw new Error(
      `Unsupported file format: .${extension || "unknown"}. ` +
      "Supported formats include PDF, DOCX, XLSX, XLS, text, Markdown, CSV, JSON, XML, YAML, and source-code files.",
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown document parsing error.";

    console.error("[Document Parser]", {
      filename: file.name,
      extension,
      message,
    });

    throw new Error(`Could not process "${file.name}": ${message}`);
  }
}
