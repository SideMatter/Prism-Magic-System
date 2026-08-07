"use client";

/**
 * SideCapcha™ — an eight-stage humanity verification gauntlet from SideMatter
 * Industries, standing between the DM and the act of giving Alex a demerit.
 * Every stage is individually passable. Passing all eight in a row is the hard
 * part.
 *
 * Failure sends you back to stage 1. After four total failures the system takes
 * pity and only sends you back one stage. It is not merciful, it is tired.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ShieldAlert, RefreshCw, MousePointer2 } from "lucide-react";

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const shuffle = <T,>(arr: T[]) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

interface StageProps {
  onPass: () => void;
  onFail: (message: string) => void;
}

/* ------------------------------------------------------------------ */
/* Stage 1 — the checkbox that does not want to be checked             */
/* ------------------------------------------------------------------ */

function StageCheckbox({ onPass }: StageProps) {
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [caught, setCaught] = useState(0);
  const [stamina, setStamina] = useState(100);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setInterval(() => setStamina((s) => Math.min(100, s + 5)), 110);
    return () => clearInterval(t);
  }, []);

  const handleMove = (e: React.MouseEvent) => {
    const rect = boxRef.current?.getBoundingClientRect();
    if (!rect) return;
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    const dist = Math.hypot(px - pos.x, (py - pos.y) * 0.45);
    if (dist < 16 && stamina > 14) {
      setStamina((s) => s - 14);
      const away = Math.atan2(pos.y - py, pos.x - px) + (Math.random() - 0.5) * 1.4;
      setPos({
        x: clamp(pos.x + Math.cos(away) * 42, 10, 90),
        y: clamp(pos.y + Math.sin(away) * 70, 18, 82),
      });
    }
  };

  const grab = () => {
    const next = caught + 1;
    setCaught(next);
    if (next >= 3) onPass();
    else {
      setStamina(100);
      setPos({ x: Math.random() * 70 + 15, y: Math.random() * 50 + 25 });
    }
  };

  const exhausted = stamina <= 14;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Check the box <strong>three times</strong>. The box has opinions about this.
      </p>
      <div
        ref={boxRef}
        onMouseMove={handleMove}
        className="relative h-52 rounded-lg border-2 border-dashed bg-muted/30 overflow-hidden"
      >
        <button
          type="button"
          onClick={grab}
          style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 rounded border-2 bg-background px-3 py-2 text-sm font-medium shadow transition-all duration-150 ${
            exhausted ? "border-green-500 animate-pulse" : "border-foreground/40"
          }`}
        >
          <span className="inline-block h-4 w-4 rounded-sm border-2 border-foreground/60" />
          I&apos;m not a robot
        </button>
        <span className="absolute bottom-2 right-3 text-[10px] uppercase tracking-widest text-muted-foreground">
          {exhausted ? "it's winded — now!" : "evading"}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <div className="h-1.5 flex-1 rounded bg-muted overflow-hidden">
          <div
            className={`h-full transition-all ${exhausted ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${stamina}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-16 text-right">{caught}/3 caught</span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 2 — select all the traffic lights, which will not hold still  */
/* ------------------------------------------------------------------ */

const DECOYS = ["🚗", "🛑", "🚏", "🚧", "🚕", "🏍️", "🚲", "🛴", "🚙", "🚌"];

interface Tile {
  id: number;
  emoji: string;
  target: boolean;
}

function buildGrid(targets: number): Tile[] {
  const fillers = shuffle(DECOYS).slice(0, 9 - targets);
  const tiles: Tile[] = [
    ...Array.from({ length: targets }, (_, i) => ({ id: i, emoji: "🚦", target: true })),
    ...fillers.map((emoji, i) => ({ id: targets + i, emoji, target: false })),
  ];
  return shuffle(tiles);
}

function StageGrid({ onPass, onFail }: StageProps) {
  const [round, setRound] = useState(1);
  const [tiles, setTiles] = useState<Tile[]>(() => buildGrid(3));
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setTiles((cur) => shuffle(cur)), 1500);
    return () => clearInterval(t);
  }, []);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const verify = () => {
    const correct = tiles.filter((t) => t.target).map((t) => t.id);
    const ok = correct.length === selected.size && correct.every((id) => selected.has(id));
    if (!ok) return onFail("Those were not all the traffic lights.");
    if (round === 1) {
      setRound(2);
      setSelected(new Set());
      setTiles(buildGrid(2));
    } else {
      onPass();
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-t-lg bg-blue-600 px-4 py-3 text-white">
        <p className="text-sm">Select all squares with</p>
        <p className="text-2xl font-bold leading-tight">traffic lights</p>
        <p className="text-xs opacity-80">
          {round === 1 ? "Round 1 of 2." : "One more. There is always one more."}
        </p>
      </div>
      <div className="grid grid-cols-3 gap-1">
        {tiles.map((tile) => (
          <button
            key={tile.id}
            type="button"
            onClick={() => toggle(tile.id)}
            className={`flex aspect-square items-center justify-center bg-muted text-4xl transition-all ${
              selected.has(tile.id) ? "scale-90 ring-4 ring-blue-500" : ""
            }`}
          >
            {tile.emoji}
          </button>
        ))}
      </div>
      <Button className="w-full" onClick={verify}>
        Verify
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 3 — case-sensitive squiggle text on a 15 second fuse          */
/* ------------------------------------------------------------------ */

const AMBIGUOUS = "iIl1oO0sS5bB8zZ2gq9nu";
const makeCode = () =>
  Array.from({ length: 7 }, () => AMBIGUOUS[Math.floor(Math.random() * AMBIGUOUS.length)]).join("");

function StageText({ onPass, onFail }: StageProps) {
  const [code, setCode] = useState(makeCode);
  const [value, setValue] = useState("");
  const [left, setLeft] = useState(15);

  useEffect(() => {
    const t = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          setCode(makeCode());
          setValue("");
          return 15;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const submit = () => (value === code ? onPass() : onFail(`It was "${code}". Obviously.`));

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Type the characters below. <strong>Case sensitive.</strong> Pasting is for robots.
      </p>
      <div className="relative select-none overflow-hidden rounded-lg border bg-gradient-to-br from-muted via-background to-muted py-7 text-center">
        {code.split("").map((ch, i) => (
          <span
            key={i}
            className="inline-block font-mono font-bold"
            style={{
              transform: `rotate(${(Math.random() - 0.5) * 55}deg) skewX(${
                (Math.random() - 0.5) * 40
              }deg) translateY(${(Math.random() - 0.5) * 18}px)`,
              fontSize: `${22 + Math.random() * 18}px`,
              opacity: 0.45 + Math.random() * 0.55,
              letterSpacing: `${Math.random() * 6}px`,
            }}
          >
            {ch}
          </span>
        ))}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M0 ${20 + i * 22} Q 70 ${Math.random() * 70} 150 ${
                Math.random() * 70
              } T 320 ${Math.random() * 70}`}
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              opacity="0.4"
            />
          ))}
        </svg>
      </div>
      <div className="h-1 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-orange-500 transition-all duration-1000 ease-linear"
          style={{ width: `${(left / 15) * 100}%` }}
        />
      </div>
      <div className="flex gap-2">
        <input
          value={value}
          autoComplete="off"
          spellCheck={false}
          onPaste={(e) => e.preventDefault()}
          onDrop={(e) => e.preventDefault()}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={`Expires in ${left}s`}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
        <Button onClick={submit}>Check</Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 4 — the slider that slides back                               */
/* ------------------------------------------------------------------ */

function StageSlider({ onPass }: StageProps) {
  const [target] = useState(() => 30 + Math.random() * 55);
  const [val, setVal] = useState(0);
  const [held, setHeld] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const pointerVal = useRef(0);
  const valRef = useRef(0);
  const heldRef = useRef(0);
  const passed = useRef(false);

  const TOL = 3;
  const NEEDED = 2000;

  useEffect(() => {
    const t = setInterval(() => {
      let v = valRef.current;
      if (dragging.current) {
        v += (pointerVal.current - v) * 0.55 + (Math.random() - 0.5) * 2.4 - 0.5;
      } else {
        v -= 1.4;
      }
      v = clamp(v, 0, 100);
      valRef.current = v;
      setVal(v);

      if (Math.abs(v - target) <= TOL) heldRef.current += 60;
      else heldRef.current = 0;
      setHeld(heldRef.current);

      if (heldRef.current >= NEEDED && !passed.current) {
        passed.current = true;
        onPass();
      }
    }, 60);
    return () => clearInterval(t);
  }, [target, onPass]);

  const toVal = (clientX: number) => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    return clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Drag the handle into the green zone and <strong>hold it there for 2 seconds</strong>. The
        handle is slippery. That is a feature.
      </p>
      <div
        ref={trackRef}
        onPointerDown={(e) => {
          dragging.current = true;
          pointerVal.current = toVal(e.clientX);
          e.currentTarget.setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (dragging.current) pointerVal.current = toVal(e.clientX);
        }}
        onPointerUp={() => (dragging.current = false)}
        onPointerCancel={() => (dragging.current = false)}
        className="relative h-14 cursor-grab touch-none rounded-lg border bg-muted"
      >
        <div
          className="absolute inset-y-0 rounded bg-green-500/30 border-x-2 border-green-500"
          style={{ left: `${target - TOL}%`, width: `${TOL * 2}%` }}
        />
        <div
          className="absolute top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-foreground/50 bg-background shadow-lg flex items-center justify-center"
          style={{ left: `${val}%` }}
        >
          <MousePointer2 className="h-4 w-4 rotate-90" />
        </div>
      </div>
      <div className="h-1.5 rounded bg-muted overflow-hidden">
        <div
          className="h-full bg-green-500 transition-none"
          style={{ width: `${(held / NEEDED) * 100}%` }}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 5 — the terms, which must be read at a human pace             */
/* ------------------------------------------------------------------ */

const TERMS = [
  "By issuing a demerit against the party member designated ALEX (hereafter, 'the Accused'), you, the Dungeon Master (hereafter, 'the Alleged Authority'), enter into a binding-ish agreement with the Demerit Board.",
  "The Alleged Authority affirms that the demerit is issued in good faith and not merely because the Accused correctly predicted the twist in session 14.",
  "The Alleged Authority acknowledges that 'he was on his phone' is not a sufficient reason if the Alleged Authority was also, at that moment, on his phone.",
  "Demerits issued between the hours of 11:00 PM and 3:00 AM are subject to a 40% credibility discount, because nobody is at their best.",
  "The Accused reserves the right to appeal. There is no appeals process. The right is symbolic and provided for morale purposes only.",
  "Any demerit issued within ten (10) minutes of the Accused rolling a natural 20 shall be presumed retaliatory until proven otherwise.",
  "The Alleged Authority agrees that the phrase 'that's not what I meant' will not be entered into the record as a reason.",
  "Neither the Demerit Board nor SideMatter Industries is liable for interpersonal fallout, passive-aggressive text messages, or the Accused bringing this up again at the next three sessions.",
  "Snack-related demerits require a witness. The witness may not be the Alleged Authority. The witness may not be a dog.",
  "The Alleged Authority confirms that the Accused's character sheet is not, in fact, the actual problem here.",
  "Demerits are non-refundable, non-transferable, and cannot be traded for inspiration, hit dice, or emotional closure.",
  "If the Accused has already been awarded a distraction title on the public Demerit Board, an additional demerit constitutes piling on, which is legal but unbecoming.",
  "The Alleged Authority accepts that this captcha exists specifically because of the Alleged Authority's past behavior.",
  "Nothing in these terms shall be construed as an endorsement of the Alleged Authority's homebrew grapple rules.",
  "Scrolling quickly through this agreement is, itself, evidence of the kind of inattention for which demerits are typically awarded. Consider that.",
  "By continuing, you affirm you have read every clause above, including this one, and clause nine, which mentioned a dog.",
];

function StageTerms({ onPass }: StageProps) {
  const [atBottom, setAtBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [scolded, setScolded] = useState(false);
  const lastTop = useRef(0);
  const ref = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    const delta = el.scrollTop - lastTop.current;
    if (delta > 130) {
      el.scrollTop = 0;
      lastTop.current = 0;
      setAtBottom(false);
      setAgreed(false);
      setScolded(true);
      setTimeout(() => setScolded(false), 2200);
      return;
    }
    lastTop.current = el.scrollTop;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 12) setAtBottom(true);
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Read the Demerit Issuance Agreement in full. Scroll gently.
      </p>
      {scolded && (
        <p className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-500">
          Bot-like scrolling detected. Returned to the top. Read it properly.
        </p>
      )}
      <div
        ref={ref}
        onScroll={onScroll}
        className="h-56 overflow-y-auto rounded-lg border bg-muted/20 p-4 text-xs leading-relaxed space-y-3"
      >
        <p className="font-bold uppercase tracking-widest">Demerit Issuance Agreement v3.1</p>
        {TERMS.map((clause, i) => (
          <p key={i}>
            <span className="font-semibold">{i + 1}.</span> {clause}
          </p>
        ))}
        <p className="pt-2 font-semibold">— End of agreement. You may now check the box.</p>
      </div>
      <label
        className={`flex items-center gap-2 text-sm ${
          atBottom ? "" : "pointer-events-none opacity-40"
        }`}
      >
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="h-4 w-4"
        />
        I have read and understood all sixteen clauses.
      </label>
      <Button className="w-full" disabled={!agreed} onClick={onPass}>
        Accept and continue
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 6 — a reading comprehension question nobody asked for         */
/* ------------------------------------------------------------------ */

const SENTENCES = [
  "The bard insisted the tavern keeper never mentioned any cursed sword before midnight",
  "Alex swore he was taking detailed notes about the entire haunted lighthouse investigation",
  "Every ranger knows a decent campfire requires patience dry kindling and absolutely no fireball",
  "The wizard quietly rerolled her initiative when nobody at the table was watching closely",
];

function StageWordplay({ onPass, onFail }: StageProps) {
  const [puzzle] = useState(() => {
    const sentence = pick(SENTENCES);
    const words = sentence.split(" ");
    const wordIdx = 3 + Math.floor(Math.random() * Math.min(4, words.length - 3));
    const word = words[wordIdx];
    const letterIdx = Math.min(2, word.length - 1);
    const countChar = pick(["e", "a", "t"]);
    const count = sentence.toLowerCase().split(countChar).length - 1;
    return {
      sentence,
      wordIdx,
      letterIdx,
      countChar,
      answer: `${word[letterIdx].toUpperCase()}${count}`,
    };
  });
  const [value, setValue] = useState("");

  const ordinal = (n: number) => ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"][n - 1];

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Humans read for meaning. Prove it.
      </p>
      <p className="rounded-lg border bg-muted/30 p-4 text-sm italic">&ldquo;{puzzle.sentence}&rdquo;</p>
      <p className="text-sm">
        Type the <strong>{ordinal(puzzle.letterIdx + 1)} letter</strong> of the{" "}
        <strong>{ordinal(puzzle.wordIdx + 1)} word</strong> (uppercase), immediately followed by the
        number of times the letter <strong>&ldquo;{puzzle.countChar}&rdquo;</strong> appears in the
        whole sentence. No spaces.
      </p>
      <div className="flex gap-2">
        <input
          value={value}
          autoComplete="off"
          onPaste={(e) => e.preventDefault()}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) =>
            e.key === "Enter" &&
            (value.trim() === puzzle.answer ? onPass() : onFail("Incorrect. Reading is hard."))
          }
          placeholder="e.g. T7"
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono"
        />
        <Button
          onClick={() =>
            value.trim() === puzzle.answer ? onPass() : onFail("Incorrect. Reading is hard.")
          }
        >
          Submit
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 7 — twenty seconds of undivided attention                     */
/* ------------------------------------------------------------------ */

function StageAttention({ onPass }: StageProps) {
  const [left, setLeft] = useState(20000);
  const [reason, setReason] = useState<string | null>(null);
  const lastMove = useRef(Date.now());
  const inside = useRef(false);
  const leftRef = useRef(20000);
  const passed = useRef(false);

  const reset = useCallback((why: string) => {
    leftRef.current = 20000;
    setLeft(20000);
    setReason(why);
  }, []);

  useEffect(() => {
    const blur = () => reset("You left the window.");
    const vis = () => document.hidden && reset("You switched tabs. We saw.");
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", vis);

    const t = setInterval(() => {
      if (passed.current) return;
      if (!inside.current) return reset("Keep the cursor inside the box.");
      if (Date.now() - lastMove.current > 2200) return reset("No movement detected. Bots are still.");
      leftRef.current -= 200;
      setLeft(leftRef.current);
      setReason(null);
      if (leftRef.current <= 0) {
        passed.current = true;
        onPass();
      }
    }, 200);

    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", vis);
      clearInterval(t);
    };
  }, [onPass, reset]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Hold the cursor inside the box and <strong>keep it moving</strong> for twenty seconds. Do not
        switch tabs. Do not click away. This is about commitment.
      </p>
      <div
        onMouseEnter={() => (inside.current = true)}
        onMouseLeave={() => (inside.current = false)}
        onMouseMove={() => (lastMove.current = Date.now())}
        className="flex h-44 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed bg-muted/30"
      >
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        <p className="text-3xl font-bold tabular-nums">{(left / 1000).toFixed(1)}s</p>
        <p className="h-4 text-xs text-red-500">{reason ?? ""}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Stage 8 — the oath, and the buttons that will not sit still         */
/* ------------------------------------------------------------------ */

const OATH_ENDINGS = [
  "and I accept the social consequences.",
  "and I will not be talked out of it.",
  "and I have considered the alternative.",
  "and this is not about the grapple rules.",
];

function StageOath({ onPass, onFail }: StageProps) {
  const [phrase] = useState(
    () => `I, the DM, do solemnly swear that Alex has earned this demerit ${pick(OATH_ENDINGS)}`
  );
  const [value, setValue] = useState("");
  const [confirmStep, setConfirmStep] = useState(0);
  const [flip, setFlip] = useState(false);

  useEffect(() => {
    if (confirmStep === 0) return;
    const t = setInterval(() => setFlip((f) => !f), 620);
    return () => clearInterval(t);
  }, [confirmStep]);

  if (confirmStep > 0) {
    const yes = (
      <Button
        key="yes"
        className="flex-1"
        onClick={() => (confirmStep === 2 ? onPass() : setConfirmStep(2))}
      >
        Yes, add the demerit
      </Button>
    );
    const no = (
      <Button
        key="no"
        variant="outline"
        className="flex-1"
        onClick={() => onFail("You clicked no. Start over and be sure this time.")}
      >
        No, I misspoke
      </Button>
    );
    return (
      <div className="space-y-4">
        <p className="text-center text-sm">
          {confirmStep === 1
            ? "Are you sure?"
            : "Are you absolutely sure? This is the last one. Probably."}
        </p>
        <div className="flex gap-3">{flip ? [no, yes] : [yes, no]}</div>
      </div>
    );
  }

  const matched = phrase.startsWith(value);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Type the following <strong>exactly</strong>, including punctuation. No pasting.
      </p>
      <p className="select-none rounded-lg border bg-muted/30 p-4 text-sm font-medium">{phrase}</p>
      <textarea
        value={value}
        rows={3}
        autoComplete="off"
        spellCheck={false}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        onChange={(e) => setValue(e.target.value)}
        className={`w-full rounded-md border bg-background p-3 text-sm ${
          value && !matched ? "border-red-500" : "border-input"
        }`}
      />
      <Button
        className="w-full"
        disabled={value !== phrase}
        onClick={() => setConfirmStep(1)}
      >
        {value === phrase ? "I so swear" : "Keep typing…"}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The gauntlet                                                        */
/* ------------------------------------------------------------------ */

const STAGES: { title: string; Component: React.ComponentType<StageProps> }[] = [
  { title: "Confirm you are not a robot", Component: StageCheckbox },
  { title: "Image verification", Component: StageGrid },
  { title: "Character verification", Component: StageText },
  { title: "Precision verification", Component: StageSlider },
  { title: "Legal acknowledgement", Component: StageTerms },
  { title: "Comprehension check", Component: StageWordplay },
  { title: "Attention verification", Component: StageAttention },
  { title: "Sworn declaration", Component: StageOath },
];

interface SideCapchaProps {
  open: boolean;
  playerName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function SideCapcha({ open, playerName, onSuccess, onCancel }: SideCapchaProps) {
  const [stage, setStage] = useState(0);
  const [seed, setSeed] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const failsRef = useRef(0);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!open) return;
    firedRef.current = false;
    setStage(0);
    setSeed((s) => s + 1);
    setError(null);
    setFails(0);
    failsRef.current = 0;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [open]);

  const handleFail = useCallback((message: string) => {
    failsRef.current += 1;
    setFails(failsRef.current);
    setError(message);
    setSeed((s) => s + 1);
    setStage((s) => (failsRef.current > 3 ? Math.max(0, s - 1) : 0));
  }, []);

  const handlePass = useCallback(() => {
    setError(null);
    setSeed((s) => s + 1);
    setStage((s) => s + 1);
  }, []);

  useEffect(() => {
    if (open && stage >= STAGES.length && !firedRef.current) {
      firedRef.current = true;
      onSuccess();
    }
  }, [open, stage, onSuccess]);

  if (!open || stage >= STAGES.length) return null;

  const { title, Component } = STAGES[stage];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b p-4">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-yellow-500" />
              <h2 className="font-bold tracking-tight">SideCapcha™</h2>
            </div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              A SideMatter Industries Product
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Elevated verification required to demerit <strong>{playerName}</strong>.
            </p>
          </div>
          <div className="text-right text-[10px] uppercase tracking-wider text-muted-foreground">
            <p>
              {Math.floor(elapsed / 60)}:{String(elapsed % 60).padStart(2, "0")} elapsed
            </p>
            <p>{fails} reset{fails === 1 ? "" : "s"}</p>
          </div>
        </div>

        <div className="flex gap-1 px-4 pt-3">
          {STAGES.map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded ${i < stage ? "bg-green-500" : i === stage ? "bg-yellow-500" : "bg-muted"}`}
            />
          ))}
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm font-semibold">
            Step {stage + 1} of {STAGES.length}: {title}
          </p>

          {error && (
            <p className="rounded bg-red-500/10 px-3 py-2 text-sm text-red-500">
              {error}
              {fails > 3 && " (Mercy protocol active: you only lost one step.)"}
            </p>
          )}

          <Component key={`${stage}-${seed}`} onPass={handlePass} onFail={handleFail} />
        </div>

        <div className="space-y-2 border-t p-3">
          <button
            type="button"
            onClick={onCancel}
            className="w-full text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Abandon verification (Alex goes free)
          </button>
          <p className="text-center text-[9px] leading-relaxed text-muted-foreground/60">
            SideCapcha™ is a registered trademark of SideMatter Industries. Protecting the
            innocent from unverified accusations since this afternoon.
          </p>
        </div>
      </div>
    </div>
  );
}
