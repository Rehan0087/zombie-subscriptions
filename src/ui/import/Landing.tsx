import { useMemo, useState, type DragEvent } from "react";
import { analyzeStatement } from "../../core";
import { monthsFeeding } from "../graveyard/encoding";
import { ZombieCard } from "../graveyard/ZombieCard";

interface Props {
  sampleCsv: string;
  currency: string;
  onFile: (name: string, text: string) => void;
  onSample: () => void;
}

/** First screen: what this does, a real headstone from the sample, and the two ways in (graveyard-ui requirement 1). */
export function Landing({ sampleCsv, currency, onFile, onSample }: Props) {
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string>();

  // The hero is the sample's price-hiked subscription, so the first thing visitors see is real output.
  const hero = useMemo(() => {
    const { detection } = analyzeStatement(sampleCsv);
    const zombie = detection.zombies.find((z) => z.priceChange && !z.dormant) ?? detection.zombies[0];
    return zombie && { zombie, months: monthsFeeding(zombie, detection.referenceDate) };
  }, [sampleCsv]);

  async function read(file: File | undefined) {
    if (!file) return;
    if (!/\.(csv|txt)$/i.test(file.name) && file.type !== "text/csv") {
      setError("This file isn't a CSV. In your bank's app or website, download the statement as CSV and try again.");
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
      <div className="landing-copy">
        <p className="wordmark">
          Zombie <b>Subscriptions</b>
        </p>
        <h1>
          Find the subscriptions <em>still feeding</em> on your money.
        </h1>
        <p className="lede">
          Drop in a bank statement. Every charge that repeats rises as a headstone with its yearly cost carved in. Bury the
          ones you're cancelling.
        </p>

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
          <strong>Drop a statement CSV here, or choose a file</strong>
          <span className="dim">Works with most bank exports: one amount column, or separate withdrawals and deposits.</span>
          <span className="privacy">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M4 7V5a4 4 0 1 1 8 0v2h1v8H3V7h1Zm2 0h4V5a2 2 0 1 0-4 0v2Z" fill="currentColor" />
            </svg>
            Read on this device only. Nothing is uploaded.
          </span>
          <input className="visually-hidden" type="file" accept=".csv,text/csv,.txt" onChange={(e) => void read(e.target.files?.[0])} />
        </label>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}

        <div className="landing-actions">
          <button className="btn btn-stone" type="button" onClick={onSample}>
            Open the sample graveyard
          </button>
          <span className="dim">An invented 14-month statement, no bank file needed.</span>
        </div>

        <ol className="how">
          <li>
            <b>Import</b> Columns and date formats are detected for you.
          </li>
          <li>
            <b>Review</b> Each recurring charge shows what it costs per year.
          </li>
          <li>
            <b>Decide</b> Bury it or spare it. Your savings add up as you go.
          </li>
        </ol>
      </div>

      {hero && (
        <figure className="hero-stone" style={{ margin: 0 }}>
          <ZombieCard zombie={hero.zombie} weight={0.75} months={hero.months} index={0} currency={currency} />
          <figcaption>From the sample: a news app that quietly raised its price.</figcaption>
        </figure>
      )}
    </main>
  );
}
