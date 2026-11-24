"use client";

import { memo, useMemo, useState, type FormEvent } from "react";
import { toStageVariables } from "@/lib/tokenStyle";
import { selectTokens, useTokenStore } from "@/store/useTokenStore";
import { Badge } from "./styleguide/Badge";
import { Button } from "./styleguide/Button";
import { Card } from "./styleguide/Card";
import { Input } from "./styleguide/Input";
import styles from "./styleguide/stage.module.css";
import { Plate } from "./ui/Plate";

const StageContent = memo(function StageContent({ systemName }: { systemName: string }) {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [autoPublish, setAutoPublish] = useState(true);
  const [progress, setProgress] = useState(64);

  const handleSubscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email.trim()) setSubscribed(true);
  };

  return (
    <>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>
          <Badge tone="primary">New</Badge>
          {systemName}
        </p>
        <h3 className={styles.heading}>Considered from the first pixel</h3>
        <p className={styles.lede}>
          Every surface on this stage is drawn from the active token set. Tune a color, a size or a radius and the
          whole composition follows.
        </p>
        <div className={styles.row}>
          <Button onClick={() => setProgress((value) => (value >= 100 ? 16 : Math.min(100, value + 12)))}>
            Advance release
          </Button>
          <Button variant="secondary">View changelog</Button>
          <Button variant="ghost">Learn more</Button>
        </div>
      </div>

      <Card title="Release digest" aside={<Badge tone={progress >= 100 ? "success" : "accent"}>{progress >= 100 ? "Shipped" : "In flight"}</Badge>}>
        <p className={styles.note}>Thursday edition · {progress}% of checks complete</p>
        <div className={styles.meter} role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <form className={styles.form} onSubmit={handleSubscribe}>
          <Input
            label="Email address"
            type="email"
            placeholder="you@studio.example"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              setSubscribed(false);
            }}
          />
          <Button type="submit">{subscribed ? "Subscribed" : "Subscribe"}</Button>
        </form>
        <label className={styles.switch}>
          <input type="checkbox" checked={autoPublish} onChange={(event) => setAutoPublish(event.target.checked)} />
          <span className={styles.track} />
          Publish automatically
        </label>
      </Card>

      <div className={styles.row}>
        <Badge>Draft</Badge>
        <Badge tone="success">Published</Badge>
        <Badge tone="warning">In review</Badge>
        <Badge tone="danger">Failed</Badge>
        <Badge tone="secondary">Beta</Badge>
      </div>
    </>
  );
});

export function ComponentSandbox() {
  const tokens = useTokenStore(selectTokens);
  const variables = useMemo(() => (tokens ? toStageVariables(tokens) : null), [tokens]);
  if (!tokens || !variables) return null;

  return (
    <Plate index="02" title="Live component stage" meta={<span className="text-ink-faint">Styled by active tokens</span>}>
      <div className={styles.stage} style={variables}>
        <StageContent systemName={tokens.meta.name} />
      </div>
    </Plate>
  );
}
