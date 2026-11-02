import { useRef, useState, type DragEvent } from "react";

interface Props {
  onFile: (name: string, text: string) => void;
  onSample: () => void;
}

/** First screen: explanation, file drop zone and the sample button (graveyard-ui requirement 1). */
export function Landing({ onFile, onSample }: Props) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string>();
  const input = useRef<HTMLInputElement>(null);

  async function read(file: File | undefined) {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name) && file.type !== "text/csv") {
      setError("That doesn't look like a CSV file. Most banks offer \"Download as CSV\" next to the statement.");
      return;
    }
    setError(undefined);
    onFile(file.name, await file.text());
  }

  function drop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    void read(e.dataTransfer.files[0]);
  }

  return (
    <main className="landing">
      <div>
        <h1 className="brand">Zombie Subscriptions</h1>
        <p className="tagline">Your forgotten subscriptions are still feeding on your money. Find them. Bury them.</p>
      </div>

      <label
        className="dropzone"
        data-over={over}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
      >
        <strong>Drop your bank statement CSV here</strong>
        <span>or click to choose a file</span>
        <span className="privacy">
          <span aria-hidden="true">🔒</span> Your statement never leaves this device. Nothing is uploaded.
        </span>
        <input
          ref={input}
          className="visually-hidden"
          type="file"
          accept=".csv,text/csv,.txt"
          onChange={(e) => void read(e.target.files?.[0])}
        />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      <div className="landing-actions">
        <button className="btn btn-primary" type="button" onClick={onSample}>
          Load sample graveyard
        </button>
        <span className="hint">No bank file handy? The sample is an invented 14-month statement.</span>
      </div>

      <ol className="steps">
        <li>
          <b>1. Summon</b> Import the CSV your bank gives you. Most layouts are recognised automatically.
        </li>
        <li>
          <b>2. Rise</b> Every recurring charge climbs out of its grave, sized by what it costs you a year.
        </li>
        <li>
          <b>3. Judge</b> Kill what you're cancelling, spare what you love, and watch your savings grow.
        </li>
      </ol>
    </main>
  );
}
