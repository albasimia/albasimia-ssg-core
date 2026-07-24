import { GitFileCommitError } from "./commit-errors";
import type {
  CommitGitFileChangesInput,
  GitFileChange,
  GitFileMode,
} from "./commit-types";
import type { GitHubSignature } from "./types";

export interface ValidatedCommitGitFileChangesInput {
  readonly client: CommitGitFileChangesInput["client"];
  readonly expectedHeadSha: string;
  readonly message: string;
  readonly author: GitHubSignature;
  readonly changes: readonly GitFileChange[];
  readonly changedPaths: readonly string[];
}

export function validateCommitGitFileChangesInput(
  input: CommitGitFileChangesInput,
): ValidatedCommitGitFileChangesInput {
  if (!input || typeof input !== "object" || !input.client) throw invalidInput("client");
  if (!Array.isArray(input.changes) || input.changes.length === 0) {
    throw new GitFileCommitError("changes must contain at least one item", {
      code: "EMPTY_CHANGES",
      path: "changes",
    });
  }

  const expectedHeadSha = requiredText(input.expectedHeadSha, "expectedHeadSha");
  const message = requiredText(input.message, "message");
  const author = validateAuthor(input.author);
  const seen = new Set<string>();
  const changes: GitFileChange[] = input.changes.map((change, index): GitFileChange => {
    const itemPath = `changes.${index}`;
    if (!change || typeof change !== "object") throw invalidInput(itemPath);
    const path = validateRepositoryPath(change.path, `${itemPath}.path`);
    if (seen.has(path)) {
      throw new GitFileCommitError(`${itemPath}.path duplicates another change`, {
        code: "DUPLICATE_PATH",
        path: `${itemPath}.path`,
      });
    }
    seen.add(path);

    if (change.type === "write") {
      if (typeof change.content !== "string") throw invalidInput(`${itemPath}.content`);
      const encoding = change.encoding ?? "utf-8";
      if (encoding !== "utf-8" && encoding !== "base64") throw invalidInput(`${itemPath}.encoding`);
      const mode = validateMode(change.mode, `${itemPath}.mode`);
      return { type: "write", path, content: change.content, encoding, ...(mode ? { mode } : {}) };
    }
    if (change.type === "delete") return { type: "delete", path };
    if (change.type === "copy") {
      const sourcePath = validateRepositoryPath(change.sourcePath, `${itemPath}.sourcePath`);
      const mode = validateMode(change.mode, `${itemPath}.mode`);
      return { type: "copy", sourcePath, path, ...(mode ? { mode } : {}) };
    }
    throw invalidInput(`${itemPath}.type`);
  });

  return {
    client: input.client,
    expectedHeadSha,
    message,
    author,
    changes,
    changedPaths: changes.map((change) => change.path),
  };
}

function validateAuthor(author: GitHubSignature): GitHubSignature {
  if (!author || typeof author !== "object") throw invalidInput("author");
  return {
    name: requiredText(author.name, "author.name"),
    email: requiredText(author.email, "author.email"),
    ...(author.date === undefined ? {} : { date: requiredText(author.date, "author.date") }),
  };
}

function validateRepositoryPath(value: unknown, path: string): string {
  const result = requiredText(value, path);
  const segments = result.split("/");
  if (
    value !== result
    || result.startsWith("/")
    || result.endsWith("/")
    || result.includes("\\")
    || segments.some((segment) => !segment || segment === "." || segment === "..")
  ) {
    throw new GitFileCommitError(`${path} is invalid`, {
      code: "INVALID_PATH",
      path,
    });
  }
  return result;
}

function validateMode(value: unknown, path: string): GitFileMode | undefined {
  if (value === undefined) return undefined;
  if (value !== "100644" && value !== "100755" && value !== "120000") {
    throw invalidInput(path);
  }
  return value;
}

function requiredText(value: unknown, path: string): string {
  if (typeof value !== "string" || !value.trim() || /[\u0000-\u001f\u007f]/.test(value)) {
    throw invalidInput(path);
  }
  return value.trim();
}

function invalidInput(path: string): GitFileCommitError {
  return new GitFileCommitError(`${path} is invalid`, {
    code: "INVALID_INPUT",
    path,
  });
}
