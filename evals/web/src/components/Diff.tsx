import { useMemo } from "react";

type DiffFile = { path: string; lines: string[]; added: number; removed: number; binary: boolean };

function parseDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  for (const line of diff.split("\n")) {
    const header = /^diff --git a\/(.+?) b\/(.+)$/.exec(line);
    if (header) {
      current = { path: header[2] ?? header[1] ?? "file", lines: [], added: 0, removed: 0, binary: false };
      files.push(current);
      continue;
    }
    if (!current) continue;
    if (/^(index |--- |\+\+\+ |new file mode|deleted file mode|similarity index|rename (from|to))/.test(line)) continue;
    if (line.startsWith("Binary files") || line.startsWith("GIT binary patch")) current.binary = true;
    if (line.startsWith("+")) current.added += 1;
    else if (line.startsWith("-")) current.removed += 1;
    current.lines.push(line);
  }
  return files;
}

const lineClass = (line: string) =>
  line.startsWith("@@") ? "hunk" : line.startsWith("+") ? "add" : line.startsWith("-") ? "del" : "ctx";

export function Diff({ diff }: { diff: string }) {
  const files = useMemo(() => parseDiff(diff), [diff]);
  if (!diff.trim()) return <p className="muted">No workspace changes.</p>;
  return (
    <div className="diff">
      {files.map((file) => (
        <details key={file.path} className="diff-file" open={file.lines.length < 400}>
          <summary>
            <code>{file.path}</code>
            <span className="diff-stat">
              <span className="add-count">+{file.added}</span> <span className="del-count">−{file.removed}</span>
            </span>
          </summary>
          {file.binary ? (
            <p className="muted">Binary change not shown.</p>
          ) : (
            <pre className="diff-lines">
              {file.lines.map((line, index) => (
                <span key={index} className={`diff-line ${lineClass(line)}`}>
                  {line || " "}
                  {"\n"}
                </span>
              ))}
            </pre>
          )}
        </details>
      ))}
    </div>
  );
}
