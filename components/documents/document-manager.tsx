"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  UploadCloud,
  CheckCircle2,
  CircleAlert,
  FileUp,
} from "lucide-react";

type DocumentStatus = "PENDING" | "PROCESSING" | "READY" | "FAILED";

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
      ...(typeof record.error === "string" ? { error: record.error } : {}),
      ...(Array.isArray(record.documents)
        ? { documents: record.documents as DocumentItem[] }
        : {}),
      ...(record.document !== null &&
        typeof record.document === "object" &&
        !Array.isArray(record.document)
        ? { document: record.document as ApiResponse["document"] }
        : {}),
    };
  } catch {
    return {};
  }
}

function statusClasses(status: DocumentStatus) {
  switch (status) {
    case "READY":
      return "border-[#5c8b18] bg-[#e9f8c9] text-[#263b0b] dark:border-[#b6ed50] dark:bg-[#26351a] dark:text-[#d5ff45]";
    case "FAILED":
      return "border-red-700 bg-red-50 text-red-800 dark:border-red-400 dark:bg-red-950/40 dark:text-red-300";
    case "PROCESSING":
      return "border-[#171714] bg-[#d5ff45] text-[#171714] dark:border-[#d5ff45] dark:bg-[#d5ff45] dark:text-[#171714]";
    default:
      return "border-[#77736b] bg-[#e9e4d9] text-[#4d4942] dark:border-[#77736b] dark:bg-[#33332d] dark:text-[#f4f0e8]";
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
    const response = await fetch("/api/documents", { cache: "no-store" });
    const data = await readResponse(response);

    if (!response.ok) throw new Error(data.error ?? "Could not load documents.");
    if (!Array.isArray(data.documents)) {
      throw new Error("The server returned an invalid document list.");
    }

    setDocuments(data.documents as DocumentItem[]);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDocuments() {
      try {
        const response = await fetch("/api/documents", { cache: "no-store" });
        const data = await readResponse(response);

        if (!response.ok) throw new Error(data.error ?? "Could not load documents.");
        if (!Array.isArray(data.documents)) {
          throw new Error("Invalid document list returned by server.");
        }

        if (active) setDocuments(data.documents as DocumentItem[]);
      } catch (err) {
        if (active) setError(getErrorMessage(err, "Could not load documents."));
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

      if (!response.ok) throw new Error(data.error ?? "Upload or indexing failed.");

      const name = data.document?.name ?? file.name;
      const chunkCount = data.document?.chunkCount;
      setNotice(
        typeof chunkCount === "number"
          ? `Indexed ${name} into ${chunkCount} chunks.`
          : `Uploaded ${name} successfully.`,
      );
      setSelectedFile(null);
      if (inputRef.current) inputRef.current.value = "";
      await refresh();
    } catch (err) {
      setError(getErrorMessage(err, "Upload failed."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    const document = documents.find((item) => item.id === id);
    if (!window.confirm(`Delete "${document?.name ?? "this document"}" and its indexed chunks?`)) {
      return;
    }

    setError("");
    setNotice("");
    setDeletingId(id);
    try {
      const response = await fetch(`/api/documents/${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await readResponse(response);
      if (!response.ok) throw new Error(data.error ?? "Delete failed.");

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
    <section className="mx-auto w-full max-w-5xl space-y-8 px-4 py-6 text-[#171714] dark:text-[#f4f0e8] sm:px-6 md:py-10">
      <header className="relative overflow-hidden border-2 border-[#171714] bg-[#fffdf7] p-6 shadow-[6px_6px_0_#171714] dark:border-[#d5ff45] dark:bg-[#22221e] dark:shadow-[6px_6px_0_#d5ff45] sm:p-8">
        <div className="absolute right-0 top-0 h-3 w-24 bg-[#d5ff45] sm:w-36" aria-hidden="true" />
        <p className="mb-3 inline-flex items-center gap-2 border-2 border-[#171714] bg-[#d5ff45] px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#171714]">
          <FileText className="size-3.5" /> Knowledge base
        </p>
        <h1 className="max-w-2xl text-3xl font-black uppercase leading-[0.98] tracking-[-0.05em] sm:text-5xl">
          Your knowledge.<br />Ready when you are.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-[#57534c] dark:text-[#c9c3b8] sm:text-base">
          Upload documents and supported code files to make their content searchable by NexGPT. Files are private to your account.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-[0.12em]">
          <span className="border border-[#171714] px-2.5 py-1.5 dark:border-[#8e8a80]">Private to you</span>
          <span className="border border-[#171714] px-2.5 py-1.5 dark:border-[#8e8a80]">25 MB max</span>
          <span className="border border-[#171714] px-2.5 py-1.5 dark:border-[#8e8a80]">Documents + code</span>
        </div>
      </header>

      <form onSubmit={upload} className="space-y-5 border-2 border-[#171714] bg-[#fffdf7] p-4 shadow-[5px_5px_0_#171714] dark:border-[#d5ff45] dark:bg-[#22221e] dark:shadow-[5px_5px_0_#d5ff45] sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#716b60] dark:text-[#c9c3b8]">01 / Add to your library</p>
            <h2 className="mt-1 text-xl font-black uppercase tracking-tight sm:text-2xl">Upload a file</h2>
          </div>
          <span className="hidden border-2 border-[#171714] bg-[#f4f0e8] px-2 py-1 text-[10px] font-bold uppercase tracking-wider dark:border-[#8e8a80] dark:bg-[#33332d] sm:inline-block">PDF · DOCX · CSV · CODE</span>
        </div>

        <label
          htmlFor="document-file"
          className={`group flex min-h-52 cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed p-6 text-center transition-colors sm:min-h-56 ${selectedFile ? "border-[#171714] bg-[#efffc6] dark:border-[#d5ff45] dark:bg-[#2c381a]" : "border-[#8e887c] bg-[#f4f0e8] hover:border-[#171714] hover:bg-[#f0f8d8] dark:border-[#77736b] dark:bg-[#292923] dark:hover:border-[#d5ff45] dark:hover:bg-[#303327]"}`}
        >
          <span className="flex size-14 items-center justify-center border-2 border-[#171714] bg-[#d5ff45] text-[#171714] shadow-[3px_3px_0_#171714] transition-transform group-hover:-translate-y-0.5 dark:border-[#d5ff45] dark:shadow-[3px_3px_0_#d5ff45]">
            {selectedFile ? <FileUp className="size-7" /> : <UploadCloud className="size-7" />}
          </span>
          <span className="text-lg font-black uppercase tracking-tight">
            {selectedFile ? "File ready to upload" : "Choose a document"}
          </span>
          <span className="max-w-xl text-sm leading-5 text-[#625d54] dark:text-[#c9c3b8]">
            PDF, Word, Excel, PowerPoint, text, Markdown, CSV, JSON, and common code files
          </span>
          <span className="border border-[#b0aa9e] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-[#625d54] dark:border-[#77736b] dark:text-[#c9c3b8]">Maximum file size: 25 MB</span>
        </label>

        <input
          ref={inputRef}
          id="document-file"
          name="file"
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          onChange={handleFileChange}
          disabled={busy}
          className="sr-only"
        />

        {selectedFile && (
          <div className="flex flex-col gap-3 border-2 border-[#171714] bg-[#f4f0e8] p-3 dark:border-[#77736b] dark:bg-[#292923] sm:flex-row sm:items-center">
            <FileText className="size-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{selectedFile.name}</p>
              <p className="mt-0.5 text-xs text-[#625d54] dark:text-[#c9c3b8]">{formatBytes(selectedFile.size)} · Ready for upload</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (inputRef.current) inputRef.current.value = "";
              }}
              disabled={busy}
              className="self-start border border-[#171714] px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-white disabled:opacity-50 dark:border-[#8e8a80] dark:hover:bg-[#3a3a32] sm:self-auto"
            >
              Remove
            </button>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-[#716b60] dark:text-[#c9c3b8]">Your file will be uploaded and indexed for search.</p>
          <button
            type="submit"
            disabled={busy || !selectedFile}
            className="inline-flex min-h-12 items-center justify-center gap-2 border-2 border-[#171714] bg-[#d5ff45] px-5 py-3 text-xs font-black uppercase tracking-[0.12em] text-[#171714] shadow-[4px_4px_0_#171714] transition-[transform,box-shadow,background-color] hover:-translate-y-0.5 hover:bg-[#c8f52e] hover:shadow-[5px_5px_0_#171714] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0_#171714] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-[#d5ff45] dark:shadow-[4px_4px_0_#d5ff45] dark:hover:shadow-[5px_5px_0_#d5ff45] dark:active:shadow-[2px_2px_0_#d5ff45]"
          >
            {busy ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
            {busy ? "Uploading and indexing…" : "Upload and index"}
          </button>
        </div>
      </form>

      {error && (
        <div role="alert" className="flex items-start gap-3 border-2 border-red-700 bg-red-50 p-4 text-sm text-red-900 shadow-[4px_4px_0_#7f1d1d] dark:border-red-400 dark:bg-red-950/40 dark:text-red-200 dark:shadow-[4px_4px_0_#7f1d1d]">
          <CircleAlert className="mt-0.5 size-5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div role="status" className="flex items-start gap-3 border-2 border-[#42620e] bg-[#efffc6] p-4 text-sm font-medium text-[#263b0b] shadow-[4px_4px_0_#171714] dark:border-[#b6ed50] dark:bg-[#26351a] dark:text-[#d5ff45] dark:shadow-[4px_4px_0_#d5ff45]">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
          <p>{notice}</p>
        </div>
      )}

      <section className="space-y-4" aria-labelledby="documents-heading">
        <div className="flex flex-col gap-3 border-b-2 border-[#171714] pb-4 dark:border-[#77736b] sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#716b60] dark:text-[#c9c3b8]">02 / Your library</p>
            <h2 id="documents-heading" className="mt-1 text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Your documents <span className="ml-1 inline-flex min-w-9 items-center justify-center border-2 border-[#171714] bg-[#d5ff45] px-2 py-0.5 align-middle text-sm text-[#171714] dark:border-[#d5ff45]">{documents.length}</span>
            </h2>
          </div>
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            className="inline-flex min-h-10 items-center justify-center gap-2 self-start border-2 border-[#171714] bg-[#fffdf7] px-3 py-2 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0_#171714] transition-all hover:-translate-y-0.5 hover:bg-[#d5ff45] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 dark:border-[#8e8a80] dark:bg-[#22221e] dark:shadow-[3px_3px_0_#77736b] dark:hover:bg-[#d5ff45] dark:hover:text-[#171714] sm:self-auto"
          >
            <RefreshCw className={`size-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="flex flex-col items-center border-2 border-dashed border-[#8e887c] bg-[#fffdf7] px-5 py-12 text-center dark:border-[#77736b] dark:bg-[#22221e]">
            <span className="flex size-14 items-center justify-center border-2 border-[#171714] bg-[#f4f0e8] text-[#171714] dark:border-[#77736b] dark:bg-[#33332d] dark:text-[#f4f0e8]">
              <FileText className="size-6" />
            </span>
            <h3 className="mt-4 text-lg font-black uppercase tracking-tight">Your library is empty</h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-[#625d54] dark:text-[#c9c3b8]">
              Upload a supported file above to start building your searchable knowledge base.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="group flex min-w-0 flex-col gap-4 border-2 border-[#171714] bg-[#fffdf7] p-4 shadow-[4px_4px_0_#171714] transition-transform hover:-translate-y-0.5 dark:border-[#77736b] dark:bg-[#22221e] dark:shadow-[4px_4px_0_#77736b] sm:flex-row sm:items-center sm:p-5"
              >
                <span className="flex size-12 shrink-0 items-center justify-center border-2 border-[#171714] bg-[#f4f0e8] text-[#171714] dark:border-[#77736b] dark:bg-[#33332d] dark:text-[#f4f0e8]">
                  <FileText className="size-5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold leading-5">{doc.name}</p>
                  <p className="mt-1.5 text-xs leading-5 text-[#716b60] dark:text-[#c9c3b8]">
                    {formatBytes(doc.sizeBytes)} <span aria-hidden="true">·</span> {doc._count?.chunks ?? 0} chunks
                  </p>
                  {doc.error && <p className="mt-2 break-words text-xs text-red-700 dark:text-red-300">{doc.error}</p>}
                </div>

                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className={`inline-flex items-center gap-1.5 border px-2.5 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] ${statusClasses(doc.status)}`}>
                    {doc.status === "PROCESSING" ? <LoaderCircle className="size-3 animate-spin" /> : null}
                    {doc.status === "READY" ? <CheckCircle2 className="size-3" /> : null}
                    {doc.status === "FAILED" ? <CircleAlert className="size-3" /> : null}
                    {doc.status}
                  </span>
                  <button
                    type="button"
                    aria-label={`Delete ${doc.name}`}
                    title={`Delete ${doc.name}`}
                    disabled={deletingId === doc.id || busy}
                    onClick={() => void remove(doc.id)}
                    className="flex size-10 shrink-0 items-center justify-center border-2 border-transparent text-[#716b60] transition-colors hover:border-red-700 hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:opacity-50 dark:text-[#c9c3b8] dark:hover:border-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                  >
                    {deletingId === doc.id ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
