
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  UploadCloud,
} from "lucide-react";

type DocumentStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FAILED";

type DocumentItem = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  error: string | null;
  createdAt: string;
  _count: { chunks: number };
};

type ApiResponse = {
  error?: string;
  documents?: DocumentItem[];
  document?: {
    id?: string;
    name?: string;
    status?: string;
    chunkCount?: number;
  };
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;

const ACCEPTED_EXTENSIONS = [
  ".pdf", ".doc", ".docx", ".odt", ".rtf",
  ".txt", ".md", ".markdown", ".csv", ".tsv",
  ".json", ".jsonl", ".xml", ".yaml", ".yml",
  ".html", ".htm", ".log",
  ".xlsx", ".xls", ".ods", ".pptx", ".ppt", ".odp",
  ".js", ".jsx", ".ts", ".tsx", ".py", ".java",
  ".c", ".h", ".cpp", ".hpp", ".cs", ".go", ".rs",
  ".php", ".rb", ".swift", ".kt", ".sql", ".sh",
  ".css", ".scss", ".sass", ".less",
  ".toml", ".ini", ".prisma", ".graphql", ".gql",
];

const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}



async function readResponse(response: Response): Promise<ApiResponse> {
  try {
    const data: unknown = await response.json();

    if (data === null || typeof data !== "object" || Array.isArray(data)) {
      return {};
    }

    const record = data as Record<string, unknown>;

    return {
      ...(typeof record.error === "string"
        ? { error: record.error }
        : {}),
      ...(Array.isArray(record.documents)
        ? { documents: record.documents as DocumentItem[] }
        : {}),
      ...(record.document !== null &&
        typeof record.document === "object" &&
        !Array.isArray(record.document)
        ? {
          document: record.document as ApiResponse["document"],
        }
        : {}),
    };
  } catch {
    return {};
  }
}

export function DocumentManager() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    const response = await fetch("/api/documents", {
      cache: "no-store",
    });

    const data = await readResponse(response);

    if (!response.ok) {
      throw new Error(data.error ?? "Could not load documents.");
    }

    if (!Array.isArray(data.documents)) {
      throw new Error("The server returned an invalid document list.");
    }

    setDocuments(data.documents as DocumentItem[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents", {
          cache: "no-store",
        });
        const data = await readResponse(response);

        if (!response.ok) {
          throw new Error(data.error ?? "Could not load documents.");
        }

        if (!Array.isArray(data.documents)) {
          throw new Error("Invalid document list returned by server.");
        }

        if (active) setDocuments(data.documents as DocumentItem[]);
      } catch (err) {
        if (active) {
          setError(getErrorMessage(err, "Could not load documents."));
        }
      }
    }

    void loadDocuments();

    return () => {
      active = false;
    };
  }, []);

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setNotice("");

    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const extension = `.${file.name.split(".").pop()?.toLowerCase() ?? ""}`;

    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setSelectedFile(null);
      event.target.value = "";
      setError("Unsupported file type. Choose a supported document or code file.");
      return;
    }

    if (file.size === 0) {
      setSelectedFile(null);
      event.target.value = "";
      setError("The selected file is empty.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);
      event.target.value = "";
      setError("Maximum file size is 25 MB.");
      return;
    }

    setSelectedFile(file);
  }

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");

    const file = selectedFile ?? inputRef.current?.files?.[0];

    if (!file) {
      setError("Choose a file first.");
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Maximum file size is 25 MB.");
      return;
    }

    setBusy(true);

    try {
      const body = new FormData();
      body.set("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body,
      });

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Upload or indexing failed.");
      }

      const name = data.document?.name ?? file.name;
      const chunkCount = data.document?.chunkCount;

      setNotice(
        typeof chunkCount === "number"
          ? `Indexed ${name} into ${chunkCount} chunks.`
          : `Uploaded ${name} successfully.`,
      );

      setSelectedFile(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const document = documents.find((item) => item.id === id);

    if (!window.confirm(
      `Delete "${document?.name ?? "this document"}" and its indexed chunks?`
    )) {
      return;
    }

    setError("");
    setNotice("");
    setDeletingId(id);

    try {
      const response = await fetch(
        `/api/documents/${encodeURIComponent(id)}`,
        { method: "DELETE" },
      );

      const data = await readResponse(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Delete failed.");
      }

      setDocuments((current) => current.filter((item) => item.id !== id));
      setNotice("Document deleted successfully.");
    } catch (err) {
      setError(getErrorMessage(err, "Delete failed."));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleRefresh() {
    setError("");
    setRefreshing(true);

    try {
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Could not refresh documents."));
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-4xl space-y-6 p-4 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold">
          Knowledge documents
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Upload documents and supported code files to make their
          content searchable by NexGPT. Files are private to your account.
        </p>
      </header>

      <form onSubmit={upload} className="space-y-4 rounded-xl border p-5">
        <label
          htmlFor="document-file"
          className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center"
        >
          <UploadCloud className="size-8" />
          <span className="font-medium">Choose a document</span>
          <span className="text-xs text-muted-foreground">
            PDF, Word, Excel, PowerPoint, text, Markdown, CSV,
            JSON, and common code files
          </span>
          <span className="text-xs text-muted-foreground">
            Maximum file size: 25 MB
          </span>
        </label>

        <input
          ref={inputRef}
          id="document-file"
          name="file"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleFileChange}
          disabled={busy}
          className="block w-full text-sm"
        />

        {selectedFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {selectedFile.name} ({formatBytes(selectedFile.size)})
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !selectedFile}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <UploadCloud className="size-4" />
          )}
          {busy ? "Uploading and indexing…" : "Upload and index"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {notice && (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      )}

      <div className="flex items-center justify-between">
        <h2 className="font-semibold">
          Your documents ({documents.length})
        </h2>

        <button
          type="button"
          onClick={() => void handleRefresh()}
          disabled={refreshing}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground disabled:opacity-50"
        >
          <RefreshCw
            className={`size-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {documents.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          No documents yet. Upload a supported file to start building
          your knowledge base.
        </div>
      ) : (
        <ul className="divide-y rounded-xl border">
          {documents.map((doc) => (
            <li
              key={doc.id}
              className="flex items-center gap-3 p-4"
            >
              <FileText className="size-5 shrink-0 text-muted-foreground" />

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {doc.name}
                </p>

                <p className="text-xs text-muted-foreground">
                  {formatBytes(doc.sizeBytes)} ·{" "}
                  {doc._count?.chunks ?? 0} chunks · {doc.status}
                </p>

                {doc.error && (
                  <p className="text-xs text-destructive">
                    {doc.error}
                  </p>
                )}
              </div>

              <button
                type="button"
                aria-label={`Delete ${doc.name}`}
                disabled={deletingId === doc.id || busy}
                onClick={() => void remove(doc.id)}
                className="rounded-md p-2 text-muted-foreground hover:text-destructive disabled:opacity-50"
              >
                {deletingId === doc.id ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : (
                  <Trash2 className="size-4" />
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
