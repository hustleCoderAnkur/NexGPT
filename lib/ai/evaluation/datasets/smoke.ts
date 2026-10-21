export const retrievalSmokeDataset = [
  { query: "What is the main topic of this document?", expectedBehavior: "Answer only if indexed sources support it." },
  { query: "List two key facts from the uploaded document.", expectedBehavior: "Cite relevant sources and avoid unsupported claims." },
  { query: "What information is not present in the document?", expectedBehavior: "Acknowledge missing evidence instead of inventing an answer." },
] as const;
