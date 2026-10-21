
import { requireUser } from "@/lib/services/auth/require-user";
import { prisma } from "@/lib/db";
import { ingestDocument } from "@/lib/ai/rag/ingestion/ingestion-service";

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB

const ALLOWED_EXTENSIONS = new Set([
  // Documents
  "pdf", "doc", "docx", "odt", "rtf",

  // Text and data
  "txt", "md", "markdown", "csv", "tsv",
  "json", "jsonl", "xml", "yaml", "yml",
  "html", "htm", "log",

  // Spreadsheets and presentations
  "xlsx", "xls", "ods", "pptx", "ppt", "odp",

  // Source code
  "js", "jsx", "ts", "tsx", "py", "java",
  "c", "h", "cpp", "hpp", "cs", "go", "rs",
  "php", "rb", "swift", "kt", "sql", "sh",
  "css", "scss", "sass", "less",

  // Configuration and developer documentation
  "toml", "ini", "prisma", "graphql", "gql",
  "gitignore",
]);

function getExtension(filename: string): string {
  const safeName = filename.replace(/[\\/]/g, "_");
  const dotIndex = safeName.lastIndexOf(".");

  if (dotIndex <= 0 || dotIndex === safeName.length - 1) {
    return "";
  }

  return safeName.slice(dotIndex + 1).toLowerCase();
}

function isAllowedFile(file: File): boolean {
  return ALLOWED_EXTENSIONS.has(getExtension(file.name));
}

function getSafeFilename(filename: string): string {
  return (
    filename
      .replace(/[\\/\0]/g, "_")
      .replace(/[\r\n]/g, "_")
      .trim()
      .slice(0, 180) || "uploaded-document"
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unknown processing error";
}

export async function POST(req: Request) {
  // Authenticate before processing the upload.
  let user: Awaited<ReturnType<typeof requireUser>>;

  try {
    user = await requireUser();
  } catch (error) {
    console.error("[Document Upload] Authentication failed:", error);
    return Response.json(
      { error: "Authentication failed." },
      { status: 401 },
    );
  }

  if (!user) {
    return Response.json(
      { error: "Unauthorized." },
      { status: 401 },
    );
  }

  let form: FormData;

  try {
    form = await req.formData();
  } catch {
    return Response.json(
      { error: "Invalid multipart form data." },
      { status: 400 },
    );
  }

  const candidate = form.get("file");

  if (!(candidate instanceof File)) {
    return Response.json(
      { error: 'Missing file. Send it using the form field "file".' },
      { status: 400 },
    );
  }

  const file = candidate;

  if (file.size === 0) {
    return Response.json(
      { error: "The selected file is empty." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return Response.json(
      { error: "Maximum file size is 25 MB." },
      { status: 413 },
    );
  }

  if (!isAllowedFile(file)) {
    return Response.json(
      {
        error:
          "Unsupported file extension. Supported types include PDF, Word, text, Markdown, CSV, JSON, spreadsheets, presentations and source-code files.",
      },
      { status: 415 },
    );
  }

  const name = getSafeFilename(file.name);

  // Create a record so failed ingestion can be tracked.
  let document;

  try {
    document = await prisma.document.create({
      data: {
        userId: user.id,
        name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        status: "PENDING",
      },
    });
  } catch (error) {
    console.error("[Document Upload] Database create failed:", error);

    return Response.json(
      { error: "Could not save the document record." },
      { status: 500 },
    );
  }

  try {
    const result = await ingestDocument(document.id, file);

    // The ingestion service should finish processing and persist chunks
    // before this route returns READY.
    return Response.json(
      {
        document: {
          id: document.id,
          name,
          status: "READY",
          ...result,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // Log the real error on the server for debugging.
    console.error("[Document Upload] Ingestion failed:", {
      documentId: document.id,
      filename: name,
      message: getErrorMessage(error),
      error,
    });

    try {
      await prisma.document.update({
        where: { id: document.id },
        data: { status: "FAILED" },
      });
    } catch (updateError) {
      console.error(
        "[Document Upload] Could not mark document FAILED:",
        updateError,
      );
    }

    return Response.json(
      {
        error:
          "The file was received, but processing failed. Check the server logs for the ingestion error.",
        documentId: document.id,
      },
      { status: 422 },
    );
  }
}
