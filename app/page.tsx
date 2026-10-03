"use client";

import {
  ALL_FORMATS,
  AudioBufferSource,
  BlobSource,
  BufferTarget,
  CanvasSink,
  CanvasSource,
  Input,
  Mp4OutputFormat,
  Output,
  Quality,
  canEncodeAudio,
  canEncodeVideo,
} from "mediabunny";
import {
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Eye,
  EyeOff,
  FileAudio,
  Film,
  GripVertical,
  ImagePlus,
  Layers3,
  LoaderCircle,
  Music2,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Settings2,
  Sparkles,
  Trash2,
  UploadCloud,
  Video,
  Volume2,
  X,
} from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STAGE_W = 1600;
const STAGE_H = 900;
const FPS = 30;

type AmbientSettings = {
  enabled: boolean;
  blur: number;
  intensity: number;
  spread: number;
  saturation: number;
  brightness: number;
  down: number;
  sides: number;
};
type AudioSettings = {
  enabled: boolean;
  volume: number;
  offset: number;
  fadeIn: number;
  fadeOut: number;
  endMode: "loop" | "silence";
};
type OutputSettings = {
  preset: string;
  width: number;
  height: number;
  quality: "low" | "medium" | "high";
  durationMode: "source" | "custom";
  customDuration: number;
  filename: string;
};
type MediaInfo = {
  name: string;
  width: number;
  height: number;
  duration: number;
  fpsLabel: string;
  format: string;
};
type OverlayLayer = {
  id: string;
  name: string;
  bitmap: ImageBitmap;
  objectUrl: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  visible: boolean;
  z: number;
};
type AnimatedRuntime = {
  kind: "animated";
  decoder: any;
  starts: number[];
  durations: number[];
  duration: number;
  currentFrame: VideoFrame | null;
  currentIndex: number;
  pendingIndex: number;
};
type VideoRuntime = {
  kind: "video";
  input: Input;
  sink: CanvasSink;
  video: HTMLVideoElement;
  objectUrl: string;
  firstTimestamp: number;
  duration: number;
};
type MediaRuntime = AnimatedRuntime | VideoRuntime;

const defaultAmbient: AmbientSettings = {
  enabled: true,
  blur: 58,
  intensity: 58,
  spread: 118,
  saturation: 138,
  brightness: 82,
  down: 112,
  sides: 58,
};
const defaultAudio: AudioSettings = {
  enabled: true,
  volume: 82,
  offset: 0,
  fadeIn: 0.6,
  fadeOut: 1.2,
  endMode: "loop",
};
const defaultOutput: OutputSettings = {
  preset: "1280x720",
  width: 1280,
  height: 720,
  quality: "high",
  durationMode: "source",
  customDuration: 10,
  filename: "viewmix-export",
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
function formatTime(seconds: number) {
  const safe = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  return `${String(Math.floor(safe / 60)).padStart(2, "0")}:${String(Math.floor(safe % 60)).padStart(2, "0")}`;
}
function rr(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(radius, w / 2, h / 2));
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const dimensions = source as CanvasImageSource & {
      videoWidth?: number;
      videoHeight?: number;
      displayWidth?: number;
      displayHeight?: number;
      naturalWidth?: number;
      naturalHeight?: number;
      width?: number;
      height?: number;
    },
    sw =
      dimensions.videoWidth ||
      dimensions.displayWidth ||
      dimensions.naturalWidth ||
      dimensions.width ||
      0,
    sh =
      dimensions.videoHeight ||
      dimensions.displayHeight ||
      dimensions.naturalHeight ||
      dimensions.height ||
      0;
  if (!sw || !sh) return;
  const sr = sw / sh,
    tr = width / height;
  if (sr > tr) {
    const cropW = sh * tr;
    ctx.drawImage(source, (sw - cropW) / 2, 0, cropW, sh, x, y, width, height);
  } else {
    const cropH = sw / tr;
    ctx.drawImage(source, 0, (sh - cropH) / 2, sw, cropH, x, y, width, height);
  }
}

function drawDemo(
  ctx: CanvasRenderingContext2D,
  time: number,
  width = 1080,
  height = 608,
) {
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, "#55c9ef");
  g.addColorStop(0.48, "#596be7");
  g.addColorStop(1, "#c34cad");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height);
  const x = width * 0.5 + Math.sin(time * 0.7) * width * 0.14,
    y = height * 0.46 + Math.cos(time * 0.53) * height * 0.12;
  const orb = ctx.createRadialGradient(x, y, 0, x, y, height * 0.48);
  orb.addColorStop(0, "rgba(255,255,255,.95)");
  orb.addColorStop(0.2, "rgba(149,242,255,.78)");
  orb.addColorStop(0.55, "rgba(84,66,214,.45)");
  orb.addColorStop(1, "rgba(20,12,72,0)");
  ctx.fillStyle = orb;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate(Math.sin(time * 0.3) * 0.08);
  ctx.strokeStyle = "rgba(255,255,255,.56)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 8; i++) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 130 + i * 44, 52 + i * 22, i * 0.22, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawStage(
  canvas: HTMLCanvasElement,
  source: CanvasImageSource | null,
  time: number,
  ambient: AmbientSettings,
  overlays: OverlayLayer[],
  ambientBuffer: HTMLCanvasElement,
  selected: string | null,
  showSelection: boolean,
) {
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;
  ctx.save();
  ctx.scale(canvas.width / STAGE_W, canvas.height / STAGE_H);
  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, 0, STAGE_W, STAGE_H);
  const p = { x: 64, y: 92, w: 1080, h: 608 };
  if (ambient.enabled) {
    ambientBuffer.width = 270;
    ambientBuffer.height = 152;
    const ac = ambientBuffer.getContext("2d", { alpha: false });
    if (ac) {
      ac.fillStyle = "#101114";
      ac.fillRect(0, 0, 270, 152);
      source
        ? drawCover(ac, source, 0, 0, 270, 152)
        : drawDemo(ac, time, 270, 152);
      const gx = 70 + ambient.sides * 1.7 + ambient.spread * 0.4,
        gy = 44 + ambient.spread * 0.36;
      ctx.save();
      ctx.globalAlpha = ambient.intensity / 100;
      ctx.filter = `blur(${ambient.blur}px) saturate(${ambient.saturation}%) brightness(${ambient.brightness}%)`;
      ctx.drawImage(
        ambientBuffer,
        p.x - gx,
        p.y - gy + ambient.down * 0.32,
        p.w + gx * 2,
        p.h + gy * 2 + ambient.down,
      );
      ctx.restore();
    }
  }
  ctx.fillStyle = "rgba(7,8,11,.82)";
  ctx.fillRect(0, 0, STAGE_W, 74);
  ctx.fillStyle = "#f5f5f5";
  ctx.font = "600 21px Arial";
  ctx.fillText("☰", 26, 46);
  rr(ctx, 68, 21, 38, 27, 8);
  ctx.fillStyle = "#ff2f45";
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.moveTo(83, 28);
  ctx.lineTo(83, 41);
  ctx.lineTo(96, 34.5);
  ctx.closePath();
  ctx.fill();
  ctx.font = "700 19px Arial";
  ctx.fillText("ViewMix", 116, 42);
  rr(ctx, 480, 15, 520, 44, 23);
  ctx.fillStyle = "#17181d";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,.13)";
  ctx.stroke();
  ctx.fillStyle = "#8c8e98";
  ctx.font = "16px Arial";
  ctx.fillText("동영상 안에서 검색", 503, 43);
  ctx.fillStyle = "#dedee3";
  ctx.font = "20px Arial";
  ctx.fillText("⌕", 1021, 44);
  ctx.fillText("＋", 1430, 44);
  ctx.fillText("♧", 1490, 43);
  ctx.beginPath();
  ctx.arc(1551, 37, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#6f63df";
  ctx.fill();
  ctx.save();
  rr(ctx, p.x, p.y, p.w, p.h, 14);
  ctx.clip();
  source
    ? drawCover(ctx, source, p.x, p.y, p.w, p.h)
    : drawDemo(ctx, time, p.w, p.h);
  ctx.restore();
  overlays
    .filter((l) => l.visible)
    .sort((a, b) => a.z - b.z)
    .forEach((layer) => {
      ctx.save();
      ctx.globalAlpha = layer.opacity / 100;
      ctx.drawImage(layer.bitmap, layer.x, layer.y, layer.width, layer.height);
      ctx.restore();
      if (showSelection && layer.id === selected) {
        ctx.save();
        ctx.strokeStyle = "#67e8f9";
        ctx.lineWidth = 3;
        ctx.setLineDash([9, 7]);
        ctx.strokeRect(
          layer.x - 4,
          layer.y - 4,
          layer.width + 8,
          layer.height + 8,
        );
        ctx.restore();
      }
    });
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "700 24px Arial";
  ctx.fillText("빛이 머무는 순간 — Ambient Session", 66, 744);
  ctx.beginPath();
  ctx.arc(90, 790, 25, 0, Math.PI * 2);
  const avatar = ctx.createLinearGradient(70, 770, 112, 812);
  avatar.addColorStop(0, "#7dd3fc");
  avatar.addColorStop(1, "#8b5cf6");
  ctx.fillStyle = avatar;
  ctx.fill();
  ctx.fillStyle = "white";
  ctx.font = "700 12px Arial";
  ctx.fillText("VM", 81, 794);
  ctx.font = "600 16px Arial";
  ctx.fillText("ViewMix Studio", 127, 788);
  ctx.fillStyle = "#9a9ca6";
  ctx.font = "13px Arial";
  ctx.fillText("구독자 12.4만명", 127, 808);
  rr(ctx, 276, 768, 92, 42, 21);
  ctx.fillStyle = "#f2f2f2";
  ctx.fill();
  ctx.fillStyle = "#111216";
  ctx.font = "700 14px Arial";
  ctx.fillText("구독", 307, 794);
  let ax = 760;
  ["♡ 3.2천", "공유", "저장", "•••"].forEach((label, i) => {
    const w = i === 0 ? 112 : i === 3 ? 48 : 78;
    rr(ctx, ax, 768, w, 42, 21);
    ctx.fillStyle = "#24262c";
    ctx.fill();
    ctx.fillStyle = "#e8e8eb";
    ctx.font = "600 14px Arial";
    ctx.fillText(label, ax + (i === 3 ? 13 : 17), 794);
    ax += w + 10;
  });
  rr(ctx, 64, 827, 1080, 58, 13);
  ctx.fillStyle = "#17181d";
  ctx.fill();
  ctx.fillStyle = "#dadbe0";
  ctx.font = "600 14px Arial";
  ctx.fillText("조회수 128만회 · 2주 전", 82, 851);
  ctx.fillStyle = "#9da0a8";
  ctx.font = "13px Arial";
  ctx.fillText("업로드한 미디어와 조명이 하나의 장면으로 완성됩니다.", 82, 873);
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "700 20px Arial";
  ctx.fillText("다음 영상", 1184, 108);
  const colors = [
      ["#2dd4bf", "#3b82f6"],
      ["#fb7185", "#7c3aed"],
      ["#fbbf24", "#ef4444"],
      ["#4ade80", "#0ea5e9"],
      ["#c084fc", "#ec4899"],
    ],
    titles = [
      "새벽의 파란 파동",
      "도시를 걷는 플레이리스트",
      "조용한 비와 네온",
      "파도 위의 메모리",
      "심야 작업실 라이브",
    ];
  colors.forEach((c, i) => {
    const y = 132 + i * 132,
      g = ctx.createLinearGradient(1184, y, 1370, y + 106);
    g.addColorStop(0, c[0]);
    g.addColorStop(1, c[1]);
    rr(ctx, 1184, y, 186, 105, 10);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,.8)";
    ctx.beginPath();
    ctx.arc(1277, y + 52, 25 + i * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f3f3f5";
    ctx.font = "600 15px Arial";
    ctx.fillText(titles[i], 1387, y + 22);
    ctx.fillStyle = "#92949d";
    ctx.font = "13px Arial";
    ctx.fillText("ViewMix", 1387, y + 49);
    ctx.fillText(`${(i + 2) * 14}만회 · ${i + 1}일 전`, 1387, y + 70);
    rr(ctx, 1327, y + 77, 35, 20, 4);
    ctx.fillStyle = "rgba(0,0,0,.72)";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "11px Arial";
    ctx.fillText(`3:${12 + i * 7}`, 1332, y + 91);
  });
  ctx.restore();
}

function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  unit = "",
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (value: number) => void;
}) {
  return (
    <label className="control-row">
      <span>{label}</span>
      <output>
        {Number.isInteger(value) ? value : value.toFixed(1)}
        {unit}
      </output>
      <Slider
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={(v) => onChange(Number(v[0]))}
        aria-label={label}
      />
    </label>
  );
}

function DropCard({
  icon,
  title,
  detail,
  accept,
  multiple = false,
  onFiles,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return (
    <button
      type="button"
      className={`drop-card ${dragging ? "is-dragging" : ""}`}
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        onFiles(Array.from(e.dataTransfer.files));
      }}
    >
      <input
        ref={ref}
        className="sr-only"
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={(e) => {
          onFiles(Array.from(e.target.files ?? []));
          e.target.value = "";
        }}
      />
      <span className="drop-icon">{icon}</span>
      <span className="drop-copy">
        <strong>{title}</strong>
        <small>{detail}</small>
      </span>
      <UploadCloud size={17} />
    </button>
  );
}

function createMixedAudioBuffer(
  source: AudioBuffer,
  duration: number,
  settings: AudioSettings,
) {
  const sampleRate = Math.min(48000, source.sampleRate),
    length = Math.max(1, Math.ceil(duration * sampleRate)),
    output = new AudioBuffer({ numberOfChannels: 2, length, sampleRate }),
    offset = Math.floor(settings.offset * source.sampleRate),
    available = Math.max(0, source.length - offset);
  for (let c = 0; c < 2; c++) {
    const input = source.getChannelData(
        Math.min(c, source.numberOfChannels - 1),
      ),
      target = output.getChannelData(c);
    for (let i = 0; i < length; i++) {
      let si = offset + Math.floor((i * source.sampleRate) / sampleRate);
      if (si >= source.length) {
        if (settings.endMode === "loop" && available > 0)
          si = offset + ((si - offset) % available);
        else continue;
      }
      const t = i / sampleRate,
        fi = settings.fadeIn > 0 ? Math.min(1, t / settings.fadeIn) : 1,
        fo =
          settings.fadeOut > 0
            ? Math.min(1, (duration - t) / settings.fadeOut)
            : 1;
      target[i] = input[si] * (settings.volume / 100) * fi * fo;
    }
  }
  return output;
}

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null),
    ambientBufferRef = useRef<HTMLCanvasElement | null>(null),
    mediaRef = useRef<MediaRuntime | null>(null),
    overlaysRef = useRef<OverlayLayer[]>([]),
    sourceRef = useRef<CanvasImageSource | null>(null),
    rafRef = useRef<number | null>(null),
    anchorRef = useRef({ media: 0, wall: performance.now() }),
    abortRef = useRef(false),
    lastExportRef = useRef<string | null>(null),
    dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const [ambient, setAmbient] = useState(defaultAmbient),
    [audio, setAudio] = useState(defaultAudio),
    [output, setOutput] = useState(defaultOutput),
    [mediaInfo, setMediaInfo] = useState<MediaInfo | null>(null),
    [mediaLoading, setMediaLoading] = useState(false),
    [mediaError, setMediaError] = useState(""),
    [overlays, setOverlays] = useState<OverlayLayer[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [musicFile, setMusicFile] = useState<File | null>(null),
    [musicBuffer, setMusicBuffer] = useState<AudioBuffer | null>(null),
    [playing, setPlaying] = useState(true),
    [playhead, setPlayhead] = useState(0),
    [codec, setCodec] = useState<"checking" | "ready" | "unavailable">(
      "checking",
    ),
    [rendering, setRendering] = useState(false),
    [progress, setProgress] = useState(0),
    [renderFrame, setRenderFrame] = useState(0),
    [elapsed, setElapsed] = useState(0),
    [lastExport, setLastExport] = useState<{
      url: string;
      name: string;
      size: number;
      videoDuration: number;
      audioDuration: number | null;
      hasAudio: boolean;
    } | null>(null),
    [toast, setToast] = useState("");
  overlaysRef.current = overlays;

  useEffect(() => {
    ambientBufferRef.current = document.createElement("canvas");
    try {
      const saved = localStorage.getItem("viewmix-settings-v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.ambient)
          setAmbient({ ...defaultAmbient, ...parsed.ambient });
        if (parsed.audio) setAudio({ ...defaultAudio, ...parsed.audio });
        if (parsed.output) setOutput({ ...defaultOutput, ...parsed.output });
      }
    } catch {}
    Promise.all([
      canEncodeVideo("avc", {
        width: 1280,
        height: 720,
        frameRate: FPS,
        quality: new Quality("medium"),
      }),
      canEncodeAudio("aac", {
        numberOfChannels: 2,
        sampleRate: 48000,
        quality: new Quality("medium"),
      }),
    ])
      .then(([v, a]) => setCodec(v && a ? "ready" : "unavailable"))
      .catch(() => setCodec("unavailable"));
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      const r = mediaRef.current;
      if (r?.kind === "video") URL.revokeObjectURL(r.objectUrl);
      if (r?.kind === "animated") r.currentFrame?.close();
      if (lastExportRef.current) URL.revokeObjectURL(lastExportRef.current);
      overlaysRef.current.forEach((l) => {
        l.bitmap.close();
        URL.revokeObjectURL(l.objectUrl);
      });
    };
  }, []);
  useEffect(() => {
    localStorage.setItem(
      "viewmix-settings-v1",
      JSON.stringify({ ambient, audio, output }),
    );
  }, [ambient, audio, output]);
  useEffect(() => {
    const c = (document as any).modelContext;
    if (!c?.registerTool) return;
    const controller = new AbortController();
    Promise.resolve(
      c.registerTool(
        {
          name: "configure_ambient_light",
          title: "Ambient Light 설정",
          description:
            "현재 프로젝트의 Ambient Light 켜기/끄기와 강도, 블러를 조정합니다.",
          inputSchema: {
            type: "object",
            properties: {
              enabled: { type: "boolean" },
              intensity: { type: "number", minimum: 0, maximum: 100 },
              blur: { type: "number", minimum: 8, maximum: 120 },
            },
            additionalProperties: false,
          },
          annotations: { readOnlyHint: false, untrustedContentHint: false },
          execute(input: {
            enabled?: boolean;
            intensity?: number;
            blur?: number;
          }) {
            if (
              input.intensity !== undefined &&
              (typeof input.intensity !== "number" ||
                input.intensity < 0 ||
                input.intensity > 100)
            )
              throw new Error("intensity는 0에서 100 사이여야 합니다.");
            if (
              input.blur !== undefined &&
              (typeof input.blur !== "number" ||
                input.blur < 8 ||
                input.blur > 120)
            )
              throw new Error("blur는 8에서 120 사이여야 합니다.");
            if (
              input.enabled !== undefined &&
              typeof input.enabled !== "boolean"
            )
              throw new Error("enabled는 boolean이어야 합니다.");
            setAmbient((p) => ({
              ...p,
              enabled: input.enabled ?? p.enabled,
              intensity: input.intensity ?? p.intensity,
              blur: input.blur ?? p.blur,
            }));
            return { status: "updated" };
          },
        },
        { signal: controller.signal },
      ),
    ).catch(() => undefined);
    return () => controller.abort();
  }, []);

  const getDuration = useCallback(
    () =>
      output.durationMode === "custom"
        ? Math.max(0.1, output.customDuration)
        : Math.max(0.1, mediaInfo?.duration ?? 10),
    [mediaInfo?.duration, output],
  );
  const ensureAnimated = useCallback(
    async (r: AnimatedRuntime, time: number) => {
      const local = r.duration > 0 ? time % r.duration : 0;
      let index = r.starts.length - 1;
      for (let i = 0; i < r.starts.length; i++) {
        if (local < r.starts[i] + r.durations[i]) {
          index = i;
          break;
        }
      }
      if (index === r.currentIndex || r.pendingIndex === index)
        return r.currentFrame;
      r.pendingIndex = index;
      try {
        const result = await r.decoder.decode({
          frameIndex: index,
          completeFramesOnly: true,
        });
        r.currentFrame?.close();
        r.currentFrame = result.image;
        r.currentIndex = index;
        sourceRef.current = result.image;
        return result.image as VideoFrame;
      } finally {
        r.pendingIndex = -1;
      }
    },
    [],
  );

  useEffect(() => {
    const draw = () => {
      const canvas = canvasRef.current,
        buffer = ambientBufferRef.current;
      if (!canvas || !buffer || rendering) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const r = mediaRef.current,
        duration = mediaInfo?.duration ?? 10;
      let time = anchorRef.current.media;
      if (playing) time += (performance.now() - anchorRef.current.wall) / 1000;
      if (duration > 0) time %= duration;
      setPlayhead((old) => (Math.abs(old - time) > 0.08 ? time : old));
      if (r?.kind === "video") {
        if (playing && r.video.paused) r.video.play().catch(() => undefined);
        if (!playing && !r.video.paused) r.video.pause();
        sourceRef.current = r.video.readyState >= 2 ? r.video : null;
      } else if (r?.kind === "animated") void ensureAnimated(r, time);
      drawStage(
        canvas,
        sourceRef.current,
        time,
        ambient,
        overlaysRef.current,
        buffer,
        selected,
        true,
      );
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [
    ambient,
    ensureAnimated,
    mediaInfo?.duration,
    playing,
    rendering,
    selected,
  ]);

  function clearMedia() {
    const r = mediaRef.current;
    if (r?.kind === "video") {
      r.video.pause();
      r.input.dispose();
      URL.revokeObjectURL(r.objectUrl);
    }
    if (r?.kind === "animated") {
      r.currentFrame?.close();
      r.decoder.close?.();
    }
    mediaRef.current = null;
    sourceRef.current = null;
    anchorRef.current = { media: 0, wall: performance.now() };
    setPlayhead(0);
  }

  async function loadMain(files: File[]) {
    const file = files[0];
    if (!file) return;
    setMediaLoading(true);
    setMediaError("");
    clearMedia();
    try {
      const lower = file.name.toLowerCase();
      if (file.type === "video/mp4" || lower.endsWith(".mp4")) {
        const input = new Input({
            formats: ALL_FORMATS,
            source: new BlobSource(file),
          }),
          track = await input.getPrimaryVideoTrack();
        if (!track || !(await track.canDecode()))
          throw new Error(
            "이 MP4의 비디오 코덱을 브라우저가 디코딩할 수 없습니다.",
          );
        const [width, height, duration, firstTimestamp, fps] =
          await Promise.all([
            track.getDisplayWidth(),
            track.getDisplayHeight(),
            track.computeDuration(),
            track.getFirstTimestamp(),
            track.computeFrameRateMetrics({ targetPacketCount: 180 }),
          ]);
        const objectUrl = URL.createObjectURL(file),
          video = document.createElement("video");
        video.src = objectUrl;
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        video.preload = "auto";
        await new Promise<void>((resolve, reject) => {
          video.onloadeddata = () => resolve();
          video.onerror = () =>
            reject(new Error("MP4를 재생용으로 준비하지 못했습니다."));
        });
        mediaRef.current = {
          kind: "video",
          input,
          sink: new CanvasSink(track, { poolSize: 3 }),
          video,
          objectUrl,
          firstTimestamp,
          duration,
        };
        setMediaInfo({
          name: file.name,
          width,
          height,
          duration,
          fpsLabel: fps.frameRateIsConstant
            ? `${fps.bestGuessFrameRate.toFixed(2)} FPS`
            : `VFR · 약 ${fps.bestGuessFrameRate.toFixed(2)} FPS`,
          format: "MP4",
        });
        if (playing) await video.play().catch(() => undefined);
      } else if (
        file.type === "image/gif" ||
        file.type === "image/webp" ||
        lower.endsWith(".gif") ||
        lower.endsWith(".webp")
      ) {
        const Ctor = (globalThis as any).ImageDecoder;
        if (!Ctor)
          throw new Error(
            "이 브라우저는 GIF/WebP 프레임 디코딩을 지원하지 않습니다. 최신 Chrome 또는 Edge를 사용해 주세요.",
          );
        const type =
            file.type || (lower.endsWith(".gif") ? "image/gif" : "image/webp"),
          decoder = new Ctor({
            data: file.stream(),
            type,
            preferAnimation: true,
          });
        await decoder.tracks.ready;
        await decoder.completed;
        const count = decoder.tracks.selectedTrack?.frameCount ?? 1,
          starts: number[] = [],
          durations: number[] = [];
        let duration = 0,
          width = 0,
          height = 0;
        for (let i = 0; i < count; i++) {
          const result = await decoder.decode({
              frameIndex: i,
              completeFramesOnly: true,
            }),
            d = Math.max(0.01, (result.image.duration ?? 100000) / 1000000);
          width ||= result.image.displayWidth || result.image.codedWidth;
          height ||= result.image.displayHeight || result.image.codedHeight;
          starts.push(duration);
          durations.push(d);
          duration += d;
          result.image.close();
        }
        const r: AnimatedRuntime = {
          kind: "animated",
          decoder,
          starts,
          durations,
          duration,
          currentFrame: null,
          currentIndex: -1,
          pendingIndex: -1,
        };
        mediaRef.current = r;
        await ensureAnimated(r, 0);
        setMediaInfo({
          name: file.name,
          width,
          height,
          duration,
          fpsLabel: `${count} 프레임 · 평균 ${(count / duration).toFixed(2)} FPS`,
          format: type === "image/gif" ? "GIF" : "Animated WebP",
        });
      } else
        throw new Error("animated WebP, GIF 또는 MP4 파일을 선택해 주세요.");
      setToast("메인 미디어를 불러왔습니다.");
    } catch (error) {
      setMediaError(
        error instanceof Error
          ? error.message
          : "미디어를 불러오지 못했습니다.",
      );
      setMediaInfo(null);
    } finally {
      setMediaLoading(false);
    }
  }

  async function loadOverlays(files: File[]) {
    const created: OverlayLayer[] = [];
    for (const [i, file] of files
      .filter((f) => /image\/(png|jpeg|webp)/.test(f.type))
      .entries()) {
      const bitmap = await createImageBitmap(file),
        width = Math.min(
          320,
          Math.max(100, bitmap.width * Math.min(1, 240 / bitmap.height)),
        );
      created.push({
        id: crypto.randomUUID(),
        name: file.name,
        bitmap,
        objectUrl: URL.createObjectURL(file),
        x: 470 + i * 24,
        y: 260 + i * 24,
        width,
        height: (width * bitmap.height) / bitmap.width,
        opacity: 100,
        visible: true,
        z: overlays.length + i,
      });
    }
    if (created.length) {
      setOverlays((p) => [...p, ...created]);
      setSelected(created.at(-1)?.id ?? null);
      setToast(`${created.length}개 이미지 레이어를 추가했습니다.`);
    }
  }
  async function loadMusic(files: File[]) {
    const file = files[0];
    if (!file) return;
    try {
      const context = new AudioContext(),
        decoded = await context.decodeAudioData(await file.arrayBuffer());
      await context.close();
      setMusicFile(file);
      setMusicBuffer(decoded);
      setAudio((p) => ({
        ...p,
        offset: Math.min(p.offset, Math.max(0, decoded.duration - 0.01)),
      }));
      setToast("음악을 불러왔습니다.");
    } catch {
      setToast("이 음악 형식은 현재 브라우저에서 디코딩할 수 없습니다.");
    }
  }
  function updateLayer(patch: Partial<OverlayLayer>) {
    if (selected)
      setOverlays((p) =>
        p.map((l) => (l.id === selected ? { ...l, ...patch } : l)),
      );
  }
  function moveLayer(direction: -1 | 1) {
    if (!selected) return;
    setOverlays((previous) => {
      const list = [...previous].sort((a, b) => a.z - b.z),
        i = list.findIndex((l) => l.id === selected),
        target = clamp(i + direction, 0, list.length - 1);
      [list[i], list[target]] = [list[target], list[i]];
      return list.map((l, z) => ({ ...l, z }));
    });
  }
  function deleteLayer(id: string) {
    setOverlays((previous) => {
      const layer = previous.find((l) => l.id === id);
      layer?.bitmap.close();
      if (layer) URL.revokeObjectURL(layer.objectUrl);
      return previous.filter((l) => l.id !== id).map((l, z) => ({ ...l, z }));
    });
    setSelected(null);
  }
  function togglePlayback() {
    const next = !playing,
      r = mediaRef.current;
    if (next) {
      anchorRef.current = { media: playhead, wall: performance.now() };
      if (r?.kind === "video") {
        r.video.currentTime = playhead;
        r.video.play().catch(() => undefined);
      }
    } else {
      const duration = mediaInfo?.duration ?? 10,
        time =
          duration > 0
            ? (anchorRef.current.media +
                (performance.now() - anchorRef.current.wall) / 1000) %
              duration
            : 0;
      anchorRef.current = { media: time, wall: performance.now() };
      setPlayhead(time);
      if (r?.kind === "video") r.video.pause();
    }
    setPlaying(next);
  }
  function seek(time: number) {
    anchorRef.current = { media: time, wall: performance.now() };
    setPlayhead(time);
    const r = mediaRef.current;
    if (r?.kind === "video") r.video.currentTime = time;
    if (r?.kind === "animated") void ensureAnimated(r, time);
  }

  async function exportMp4() {
    if (!mediaInfo || !mediaRef.current || codec !== "ready" || rendering)
      return;
    setRendering(true);
    setProgress(0);
    setRenderFrame(0);
    setElapsed(0);
    abortRef.current = false;
    const started = performance.now(),
      wasPlaying = playing;
    setPlaying(false);
    try {
      const duration = getDuration(),
        count = Math.ceil(duration * FPS),
        canvas = document.createElement("canvas");
      canvas.width = Math.max(320, Math.round(output.width / 2) * 2);
      canvas.height = Math.max(180, Math.round(output.height / 2) * 2);
      const target = new BufferTarget(),
        mux = new Output({
          format: new Mp4OutputFormat({ fastStart: "in-memory" }),
          target,
        }),
        videoSource = new CanvasSource(canvas, {
          codec: "avc",
          quality: new Quality(output.quality),
          frameRate: FPS,
        });
      mux.addVideoTrack(videoSource);
      let audioSource: AudioBufferSource | null = null,
        mixed: AudioBuffer | null = null;
      if (audio.enabled && musicBuffer) {
        mixed = createMixedAudioBuffer(musicBuffer, duration, audio);
        audioSource = new AudioBufferSource({
          codec: "aac",
          quality: new Quality(output.quality),
        });
        mux.addAudioTrack(audioSource);
      }
      await mux.start();
      if (audioSource && mixed) await audioSource.add(mixed);
      const runtime = mediaRef.current;
      if (runtime.kind === "video") {
        const times = Array.from(
          { length: count },
          (_, i) => runtime.firstTimestamp + ((i / FPS) % runtime.duration),
        );
        let i = 0;
        for await (const result of runtime.sink.canvasesAtTimestamps(times)) {
          if (abortRef.current) {
            await mux.cancel();
            throw new Error("렌더링을 취소했습니다.");
          }
          const t = i / FPS;
          drawStage(
            canvas,
            result?.canvas ?? null,
            t,
            ambient,
            overlaysRef.current,
            ambientBufferRef.current!,
            null,
            false,
          );
          await videoSource.add(t, Math.min(1 / FPS, duration - t), {
            keyFrame: i % (FPS * 2) === 0,
          });
          i++;
          if (i % 3 === 0 || i === count) {
            setRenderFrame(i);
            setProgress(i / count);
            setElapsed((performance.now() - started) / 1000);
            await new Promise((r) => requestAnimationFrame(r));
          }
        }
      } else {
        for (let i = 0; i < count; i++) {
          if (abortRef.current) {
            await mux.cancel();
            throw new Error("렌더링을 취소했습니다.");
          }
          const t = i / FPS,
            frame = await ensureAnimated(runtime, t);
          drawStage(
            canvas,
            frame,
            t,
            ambient,
            overlaysRef.current,
            ambientBufferRef.current!,
            null,
            false,
          );
          await videoSource.add(t, Math.min(1 / FPS, duration - t), {
            keyFrame: i % (FPS * 2) === 0,
          });
          if (i % 3 === 0 || i === count - 1) {
            setRenderFrame(i + 1);
            setProgress((i + 1) / count);
            setElapsed((performance.now() - started) / 1000);
            await new Promise((r) => requestAnimationFrame(r));
          }
        }
      }
      await mux.finalize();
      if (!target.buffer) throw new Error("MP4 데이터를 완성하지 못했습니다.");
      const blob = new Blob([target.buffer], { type: "video/mp4" });
      const verificationInput = new Input({
        formats: ALL_FORMATS,
        source: new BlobSource(blob),
      });
      const [verifiedVideo, verifiedAudio] = await Promise.all([
        verificationInput.getPrimaryVideoTrack(),
        verificationInput.getPrimaryAudioTrack(),
      ]);
      if (!verifiedVideo)
        throw new Error("완성된 MP4에서 비디오 트랙을 확인하지 못했습니다.");
      if (audio.enabled && musicBuffer && !verifiedAudio)
        throw new Error("완성된 MP4에서 오디오 트랙을 확인하지 못했습니다.");
      const [videoDuration, audioDuration] = await Promise.all([
        verifiedVideo.computeDuration(),
        verifiedAudio ? verifiedAudio.computeDuration() : Promise.resolve(null),
      ]);
      if (Math.abs(videoDuration - duration) > Math.max(0.12, 2 / FPS))
        throw new Error("완성된 MP4의 영상 길이가 예상 범위를 벗어났습니다.");
      if (
        audioDuration !== null &&
        Math.abs(audioDuration - duration) > Math.max(0.15, 3 / FPS)
      )
        throw new Error("완성된 MP4의 오디오 길이가 영상과 맞지 않습니다.");
      const finalFrame = await new CanvasSink(verifiedVideo, {
        width: 64,
        height: 36,
      }).getCanvas(Math.max(0, videoDuration - 1 / FPS));
      if (!finalFrame)
        throw new Error("완성된 MP4의 마지막 프레임을 디코딩하지 못했습니다.");
      const finalContext = finalFrame.canvas.getContext("2d", {
        willReadFrequently: true,
      }) as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
      if (!finalContext)
        throw new Error("완성된 MP4의 마지막 프레임을 검사하지 못했습니다.");
      const pixels = finalContext.getImageData(0, 0, 64, 36).data;
      let luminance = 0;
      for (let index = 0; index < pixels.length; index += 4)
        luminance += pixels[index] + pixels[index + 1] + pixels[index + 2];
      if (luminance / (pixels.length / 4) / 3 < 1)
        throw new Error("완성된 MP4의 마지막 프레임이 비어 있습니다.");
      verificationInput.dispose();
      const url = URL.createObjectURL(blob),
        link = document.createElement("a"),
        safe = (output.filename.trim() || "viewmix-export").replace(
          /[\\/:*?"<>|]+/g,
          "-",
        );
      const name = safe.endsWith(".mp4") ? safe : `${safe}.mp4`;
      if (lastExportRef.current) URL.revokeObjectURL(lastExportRef.current);
      lastExportRef.current = url;
      setLastExport({
        url,
        name,
        size: blob.size,
        videoDuration,
        audioDuration,
        hasAudio: Boolean(verifiedAudio),
      });
      link.href = url;
      link.download = name;
      link.click();
      setToast("MP4 다운로드가 시작되었습니다.");
    } catch (error) {
      setToast(
        error instanceof Error
          ? error.message
          : "렌더링 중 오류가 발생했습니다.",
      );
    } finally {
      setRendering(false);
      abortRef.current = false;
      if (wasPlaying) {
        anchorRef.current = { media: playhead, wall: performance.now() };
        setPlaying(true);
      }
    }
  }

  const selectedLayer = overlays.find((l) => l.id === selected) ?? null,
    duration = getDuration(),
    frameCount = Math.ceil(duration * FPS),
    remaining = progress > 0 ? Math.max(0, elapsed / progress - elapsed) : 0;
  function pointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(),
      x = ((e.clientX - rect.left) * STAGE_W) / rect.width,
      y = ((e.clientY - rect.top) * STAGE_H) / rect.height,
      hit = [...overlays]
        .filter((l) => l.visible)
        .sort((a, b) => b.z - a.z)
        .find(
          (l) =>
            x >= l.x && x <= l.x + l.width && y >= l.y && y <= l.y + l.height,
        );
    if (hit) {
      setSelected(hit.id);
      dragRef.current = { id: hit.id, dx: x - hit.x, dy: y - hit.y };
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }
  function pointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current,
      drag = dragRef.current;
    if (!canvas || !drag) return;
    const rect = canvas.getBoundingClientRect(),
      x = ((e.clientX - rect.left) * STAGE_W) / rect.width,
      y = ((e.clientY - rect.top) * STAGE_H) / rect.height;
    setOverlays((p) =>
      p.map((l) =>
        l.id === drag.id
          ? {
              ...l,
              x: clamp(x - drag.dx, 0, STAGE_W - l.width),
              y: clamp(y - drag.dy, 0, STAGE_H - l.height),
            }
          : l,
      ),
    );
  }

  return (
    <main className="app-shell">
      <header className="app-header">
        <div className="brand">
          <span>
            <Play size={14} fill="currentColor" />
          </span>
          ViewMix<em>LOCAL</em>
        </div>
        <div className="project-title">
          <i />새 프로젝트 <ChevronDown size={15} />
        </div>
        <div className="header-actions">
          <span className={`codec-pill ${codec}`}>
            {codec === "checking"
              ? "코덱 확인 중"
              : codec === "ready"
                ? "H.264 + AAC 준비됨"
                : "MP4 인코딩 미지원"}
          </span>
          <Button variant="ghost" size="icon-sm" aria-label="도움말">
            <CircleHelp />
          </Button>
        </div>
      </header>
      <div className="workspace-grid">
        <aside className="left-panel panel-scroll">
          <section className="panel-section">
            <div className="section-heading">
              <span>
                <Film />
                미디어
              </span>
              <small>로컬 처리</small>
            </div>
            <DropCard
              icon={
                mediaLoading ? <LoaderCircle className="spin" /> : <Video />
              }
              title="메인 애니메이션"
              detail="GIF · WebP · MP4"
              accept="image/gif,image/webp,video/mp4,.gif,.webp,.mp4"
              onFiles={loadMain}
            />
            {mediaError && <p className="inline-error">{mediaError}</p>}
            {mediaInfo && (
              <div className="media-card">
                <div className="file-icon">
                  <Film />
                </div>
                <div className="media-main">
                  <strong>{mediaInfo.name}</strong>
                  <span>
                    {mediaInfo.format} · {formatTime(mediaInfo.duration)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => {
                    clearMedia();
                    setMediaInfo(null);
                  }}
                >
                  <X />
                </Button>
                <dl>
                  <div>
                    <dt>해상도</dt>
                    <dd>
                      {mediaInfo.width} × {mediaInfo.height}
                    </dd>
                  </div>
                  <div>
                    <dt>프레임</dt>
                    <dd>{mediaInfo.fpsLabel}</dd>
                  </div>
                </dl>
              </div>
            )}
          </section>
          <section className="panel-section layer-section">
            <div className="section-heading">
              <span>
                <Layers3 />
                이미지 레이어
              </span>
              <small>{overlays.length}</small>
            </div>
            <DropCard
              icon={<ImagePlus />}
              title="이미지 추가"
              detail="PNG · JPEG · WebP"
              accept="image/png,image/jpeg,image/webp"
              multiple
              onFiles={loadOverlays}
            />
            <div className="layer-list">
              {[...overlays]
                .sort((a, b) => b.z - a.z)
                .map((layer) => (
                  <div
                    key={layer.id}
                    role="button"
                    tabIndex={0}
                    className={`layer-item ${layer.id === selected ? "selected" : ""}`}
                    onClick={() => setSelected(layer.id)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelected(layer.id);
                      }
                    }}
                  >
                    <GripVertical className="grip" />
                    <img src={layer.objectUrl} alt="" />
                    <span>
                      <strong>{layer.name}</strong>
                      <small>
                        {Math.round(layer.width)} × {Math.round(layer.height)}
                      </small>
                    </span>
                    <span className="layer-actions">
                      <button
                        type="button"
                        aria-label="표시 전환"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOverlays((p) =>
                            p.map((l) =>
                              l.id === layer.id
                                ? { ...l, visible: !l.visible }
                                : l,
                            ),
                          );
                        }}
                      >
                        {layer.visible ? <Eye /> : <EyeOff />}
                      </button>
                      <button
                        type="button"
                        aria-label="삭제"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteLayer(layer.id);
                        }}
                      >
                        <Trash2 />
                      </button>
                    </span>
                  </div>
                ))}
              {!overlays.length && (
                <div className="empty-layers">
                  <Layers3 />
                  <span>추가한 이미지가 여기에 쌓입니다.</span>
                </div>
              )}
            </div>
          </section>
          <section className="privacy-note">
            <Sparkles />
            <span>
              <strong>파일은 이 기기 안에서만 처리됩니다.</strong> 업로드나
              네트워크 전송이 없습니다.
            </span>
          </section>
        </aside>
        <section className="stage-column">
          <div className="stage-toolbar">
            <div>
              <strong>출력 프레임</strong>
              <span>
                {output.width} × {output.height} · {FPS} FPS
              </span>
            </div>
            <div>미리보기 55%</div>
          </div>
          <div className="stage-wrap">
            <canvas
              ref={canvasRef}
              width={1280}
              height={720}
              aria-label="최종 합성 영상 미리보기"
              onPointerDown={pointerDown}
              onPointerMove={pointerMove}
              onPointerUp={() => {
                dragRef.current = null;
              }}
              onPointerCancel={() => {
                dragRef.current = null;
              }}
            />
            {!mediaInfo && (
              <div className="stage-empty">
                <span>
                  <Plus />
                </span>
                <div>
                  <strong>메인 미디어를 추가하세요</strong>
                  <small>
                    예시 장면 대신 업로드한 애니메이션이 표시됩니다.
                  </small>
                </div>
              </div>
            )}
          </div>
          <div className="transport">
            <Button variant="ghost" size="icon" onClick={togglePlayback}>
              {playing ? (
                <Pause fill="currentColor" />
              ) : (
                <Play fill="currentColor" />
              )}
            </Button>
            <span>{formatTime(playhead)}</span>
            <Slider
              min={0}
              max={Math.max(0.1, mediaInfo?.duration ?? 10)}
              step={0.01}
              value={[playhead]}
              onValueChange={(v) => seek(Number(v[0]))}
            />
            <span>{formatTime(mediaInfo?.duration ?? 10)}</span>
            <Volume2 />
          </div>
          <div className="stage-hint">
            <Sparkles />
            <span>
              현재 프레임을 저해상도 버퍼로 복제해 확산하므로 프리뷰와 출력이
              같은 렌더링 경로를 사용합니다.
            </span>
          </div>
        </section>
        <aside className="right-panel panel-scroll">
          <Tabs defaultValue="ambient">
            <TabsList className="settings-tabs">
              <TabsTrigger value="layer">레이어</TabsTrigger>
              <TabsTrigger value="ambient">Ambient</TabsTrigger>
              <TabsTrigger value="audio">오디오</TabsTrigger>
              <TabsTrigger value="output">출력</TabsTrigger>
            </TabsList>
            <TabsContent value="layer" className="settings-content">
              <div className="settings-title">
                <span>
                  <Layers3 />
                  선택 레이어
                </span>
              </div>
              {selectedLayer ? (
                <>
                  <div className="selected-preview">
                    <img src={selectedLayer.objectUrl} alt="선택한 레이어" />
                    <span>{selectedLayer.name}</span>
                  </div>
                  <div className="field-grid">
                    <label>
                      X
                      <input
                        type="number"
                        value={Math.round(selectedLayer.x)}
                        onChange={(e) =>
                          updateLayer({ x: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Y
                      <input
                        type="number"
                        value={Math.round(selectedLayer.y)}
                        onChange={(e) =>
                          updateLayer({ y: Number(e.target.value) })
                        }
                      />
                    </label>
                    <label>
                      Width
                      <input
                        type="number"
                        min="16"
                        value={Math.round(selectedLayer.width)}
                        onChange={(e) => {
                          const width = Math.max(16, Number(e.target.value));
                          updateLayer({
                            width,
                            height:
                              (width * selectedLayer.bitmap.height) /
                              selectedLayer.bitmap.width,
                          });
                        }}
                      />
                    </label>
                    <label>
                      Height
                      <input
                        type="number"
                        value={Math.round(selectedLayer.height)}
                        disabled
                      />
                    </label>
                  </div>
                  <SliderRow
                    label="Opacity"
                    value={selectedLayer.opacity}
                    min={0}
                    max={100}
                    unit="%"
                    onChange={(opacity) => updateLayer({ opacity })}
                  />
                  <div className="layer-order">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveLayer(1)}
                    >
                      <ChevronUp />
                      앞으로
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => moveLayer(-1)}
                    >
                      <ChevronDown />
                      뒤로
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteLayer(selectedLayer.id)}
                    >
                      <Trash2 />
                      삭제
                    </Button>
                  </div>
                </>
              ) : (
                <div className="settings-empty">
                  <ImagePlus />
                  <strong>레이어를 선택하세요</strong>
                  <span>
                    왼쪽 목록이나 캔버스의 이미지를 눌러 조정할 수 있습니다.
                  </span>
                </div>
              )}
            </TabsContent>
            <TabsContent value="ambient" className="settings-content">
              <div className="settings-title">
                <span>
                  <Sparkles />
                  Ambient Light
                </span>
                <Switch
                  checked={ambient.enabled}
                  onCheckedChange={(enabled) =>
                    setAmbient((p) => ({ ...p, enabled }))
                  }
                />
              </div>
              <div
                className={`settings-stack ${!ambient.enabled ? "disabled" : ""}`}
              >
                <SliderRow
                  label="Blur"
                  value={ambient.blur}
                  min={8}
                  max={120}
                  unit="px"
                  onChange={(blur) => setAmbient((p) => ({ ...p, blur }))}
                />
                <SliderRow
                  label="Intensity"
                  value={ambient.intensity}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(intensity) =>
                    setAmbient((p) => ({ ...p, intensity }))
                  }
                />
                <SliderRow
                  label="Spread"
                  value={ambient.spread}
                  min={60}
                  max={180}
                  unit="%"
                  onChange={(spread) => setAmbient((p) => ({ ...p, spread }))}
                />
                <SliderRow
                  label="Saturation"
                  value={ambient.saturation}
                  min={70}
                  max={220}
                  unit="%"
                  onChange={(saturation) =>
                    setAmbient((p) => ({ ...p, saturation }))
                  }
                />
                <SliderRow
                  label="Brightness"
                  value={ambient.brightness}
                  min={40}
                  max={160}
                  unit="%"
                  onChange={(brightness) =>
                    setAmbient((p) => ({ ...p, brightness }))
                  }
                />
                <SliderRow
                  label="아래 확산"
                  value={ambient.down}
                  min={0}
                  max={220}
                  unit="px"
                  onChange={(down) => setAmbient((p) => ({ ...p, down }))}
                />
                <SliderRow
                  label="좌우 확산"
                  value={ambient.sides}
                  min={0}
                  max={160}
                  unit="px"
                  onChange={(sides) => setAmbient((p) => ({ ...p, sides }))}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="reset-button"
                onClick={() => setAmbient(defaultAmbient)}
              >
                <RotateCcw />
                기본값 복원
              </Button>
            </TabsContent>
            <TabsContent value="audio" className="settings-content">
              <div className="settings-title">
                <span>
                  <Music2 />
                  음악
                </span>
                <Switch
                  checked={audio.enabled}
                  onCheckedChange={(enabled) =>
                    setAudio((p) => ({ ...p, enabled }))
                  }
                />
              </div>
              <DropCard
                icon={<FileAudio />}
                title="음악 파일"
                detail="MP3 · WAV · M4A · AAC"
                accept="audio/*,.mp3,.wav,.m4a,.aac"
                onFiles={loadMusic}
              />
              {musicFile && (
                <div className="audio-file">
                  <Music2 />
                  <span>
                    <strong>{musicFile.name}</strong>
                    <small>
                      {formatTime(musicBuffer?.duration ?? 0)} · 메인 원본
                      오디오는 제외
                    </small>
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => {
                      setMusicFile(null);
                      setMusicBuffer(null);
                    }}
                  >
                    <X />
                  </Button>
                </div>
              )}
              <div
                className={`settings-stack ${!audio.enabled ? "disabled" : ""}`}
              >
                <SliderRow
                  label="볼륨"
                  value={audio.volume}
                  min={0}
                  max={100}
                  unit="%"
                  onChange={(volume) => setAudio((p) => ({ ...p, volume }))}
                />
                <SliderRow
                  label="음악 시작 지점"
                  value={audio.offset}
                  min={0}
                  max={Math.max(1, musicBuffer?.duration ?? 180)}
                  step={0.1}
                  unit="초"
                  onChange={(offset) => setAudio((p) => ({ ...p, offset }))}
                />
                <SliderRow
                  label="Fade-in"
                  value={audio.fadeIn}
                  min={0}
                  max={10}
                  step={0.1}
                  unit="초"
                  onChange={(fadeIn) => setAudio((p) => ({ ...p, fadeIn }))}
                />
                <SliderRow
                  label="Fade-out"
                  value={audio.fadeOut}
                  min={0}
                  max={10}
                  step={0.1}
                  unit="초"
                  onChange={(fadeOut) => setAudio((p) => ({ ...p, fadeOut }))}
                />
                <label className="select-field">
                  <span>음악이 먼저 끝나면</span>
                  <select
                    value={audio.endMode}
                    onChange={(e) =>
                      setAudio((p) => ({
                        ...p,
                        endMode: e.target.value as AudioSettings["endMode"],
                      }))
                    }
                  >
                    <option value="loop">처음부터 반복</option>
                    <option value="silence">남은 구간 무음</option>
                  </select>
                </label>
              </div>
            </TabsContent>
            <TabsContent value="output" className="settings-content">
              <div className="settings-title">
                <span>
                  <Settings2 />
                  출력 설정
                </span>
              </div>
              <label className="select-field">
                <span>해상도</span>
                <select
                  value={output.preset}
                  onChange={(e) => {
                    const value = e.target.value,
                      [width, height] =
                        value === "custom"
                          ? [output.width, output.height]
                          : value.split("x").map(Number);
                    setOutput((p) => ({ ...p, preset: value, width, height }));
                  }}
                >
                  <option value="1920x1080">1920 × 1080</option>
                  <option value="1280x720">1280 × 720</option>
                  <option value="854x480">854 × 480</option>
                  <option value="custom">사용자 지정</option>
                </select>
              </label>
              {output.preset === "custom" && (
                <div className="field-grid">
                  <label>
                    Width
                    <input
                      type="number"
                      min="320"
                      step="2"
                      value={output.width}
                      onChange={(e) =>
                        setOutput((p) => ({
                          ...p,
                          width: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                  <label>
                    Height
                    <input
                      type="number"
                      min="180"
                      step="2"
                      value={output.height}
                      onChange={(e) =>
                        setOutput((p) => ({
                          ...p,
                          height: Number(e.target.value),
                        }))
                      }
                    />
                  </label>
                </div>
              )}
              <label className="select-field">
                <span>품질</span>
                <select
                  value={output.quality}
                  onChange={(e) =>
                    setOutput((p) => ({
                      ...p,
                      quality: e.target.value as OutputSettings["quality"],
                    }))
                  }
                >
                  <option value="low">낮음</option>
                  <option value="medium">보통</option>
                  <option value="high">높음</option>
                </select>
              </label>
              <label className="select-field">
                <span>영상 길이</span>
                <select
                  value={output.durationMode}
                  onChange={(e) =>
                    setOutput((p) => ({
                      ...p,
                      durationMode: e.target
                        .value as OutputSettings["durationMode"],
                    }))
                  }
                >
                  <option value="source">원본 길이 사용</option>
                  <option value="custom">사용자 지정</option>
                </select>
              </label>
              {output.durationMode === "custom" && (
                <label className="text-field">
                  <span>길이(초)</span>
                  <input
                    type="number"
                    min=".1"
                    step=".1"
                    value={output.customDuration}
                    onChange={(e) =>
                      setOutput((p) => ({
                        ...p,
                        customDuration: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              )}
              <label className="text-field">
                <span>파일명</span>
                <input
                  value={output.filename}
                  onChange={(e) =>
                    setOutput((p) => ({ ...p, filename: e.target.value }))
                  }
                />
                <em>.mp4</em>
              </label>
              <div className="output-summary">
                <div>
                  <span>코덱</span>
                  <strong>H.264 / AAC</strong>
                </div>
                <div>
                  <span>예상 프레임</span>
                  <strong>{frameCount.toLocaleString()}</strong>
                </div>
                <div>
                  <span>길이</span>
                  <strong>{formatTime(duration)}</strong>
                </div>
              </div>
            </TabsContent>
          </Tabs>
          <div className="export-dock">
            {rendering ? (
              <div className="render-progress">
                <div>
                  <strong>MP4 렌더링 중</strong>
                  <span>{Math.round(progress * 100)}%</span>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${progress * 100}%` }} />
                </div>
                <small>
                  프레임 {renderFrame.toLocaleString()} /{" "}
                  {frameCount.toLocaleString()} · 경과 {formatTime(elapsed)}
                  {remaining > 0 ? ` · 약 ${formatTime(remaining)} 남음` : ""}
                </small>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    abortRef.current = true;
                  }}
                >
                  렌더링 취소
                </Button>
              </div>
            ) : (
              <>
                <Button
                  className="export-button"
                  size="lg"
                  disabled={!mediaInfo || codec !== "ready"}
                  onClick={exportMp4}
                >
                  <Film />
                  MP4 렌더링 · 다운로드
                </Button>
                <p>
                  {!mediaInfo
                    ? "먼저 메인 미디어를 추가하세요."
                    : codec !== "ready"
                      ? "최신 Chrome/Edge의 localhost에서 열어 주세요."
                      : "모든 처리는 브라우저 안에서 진행됩니다."}
                </p>
                {lastExport && (
                  <a
                    className="repeat-download"
                    href={lastExport.url}
                    download={lastExport.name}
                  >
                    마지막 MP4 다시 다운로드 ·{" "}
                    {(lastExport.size / 1024 / 1024).toFixed(1)} MB
                  </a>
                )}
                {lastExport && (
                  <small className="export-verified">
                    검증 완료 · 영상 {lastExport.videoDuration.toFixed(2)}초
                    {lastExport.hasAudio && lastExport.audioDuration !== null
                      ? ` · 오디오 ${lastExport.audioDuration.toFixed(2)}초`
                      : " · 오디오 없음"}
                  </small>
                )}
              </>
            )}
          </div>
        </aside>
      </div>
      {toast && (
        <button type="button" className="toast" onClick={() => setToast("")}>
          <span>{toast}</span>
          <X />
        </button>
      )}
    </main>
  );
}
