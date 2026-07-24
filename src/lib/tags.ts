interface NodeTag {
  text: string;
  tone: "blue" | "green" | "orange" | "yellow" | "red" | "purple" | "gray";
}

const TONES = new Set<NodeTag["tone"]>([
  "blue",
  "green",
  "orange",
  "yellow",
  "red",
  "purple",
  "gray",
]);

export function parseNodeTags(raw: string | null | undefined): NodeTag[] {
  if (!raw?.trim()) return [];

  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const match = part.match(/^(.*?)<([^<>]+)>$/);
      const text = (match?.[1] || part).trim();
      const requestedTone = (match?.[2] || "gray").trim().toLowerCase();
      const tone = TONES.has(requestedTone as NodeTag["tone"])
        ? (requestedTone as NodeTag["tone"])
        : "gray";
      return { text, tone };
    })
    .filter((tag) => tag.text);
}

export function getTagToneClass(tone: NodeTag["tone"]): string {
  switch (tone) {
    case "blue":
      return "tag-blue";
    case "green":
      return "tag-green";
    case "orange":
      return "tag-orange";
    case "yellow":
      return "tag-yellow";
    case "red":
      return "tag-red";
    case "purple":
      return "tag-purple";
    default:
      return "tag-gray";
  }
}
