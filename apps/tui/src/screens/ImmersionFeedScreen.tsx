import React, { useMemo, useState } from "react";
import { Box, Text, useInput } from "ink";
import { getImmersionFeed } from "@gofluent/application";
import type { ImmersionFeedItem } from "@gofluent/content-engine";
import type { AppServices } from "../app/bootstrap.js";
import { SelectList } from "../components/SelectList.js";

export interface ImmersionFeedScreenProps {
  services: AppServices;
  onOpenConversation: (topic: string) => void;
  onOpenBlindListening: (topic: string) => void;
  onOpenMediaPrep: (title: string) => void;
  onBack: () => void;
}

const KIND_ICON: Record<ImmersionFeedItem["kind"], string> = {
  PODCAST: "🎧", STORY: "📖", DIALOGUE: "🎬", ARTICLE: "📰", CONVERSATION: "🎤",
};

/**
 * Content recommendation engine / Immersion Feed (ROADMAP Phase 7,
 * RESEARCH.md §30). Not infinite-scroll — a short, fixed list with a clear
 * educational endpoint per item.
 */
export function ImmersionFeedScreen({ services, onOpenConversation, onOpenBlindListening, onOpenMediaPrep, onBack }: ImmersionFeedScreenProps): React.JSX.Element {
  const feed = useMemo(() => getImmersionFeed(services.db, services.userId, "en"), [services]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useInput((_input, key) => { if (key.escape) { if (selectedIndex !== null) setSelectedIndex(null); else onBack(); } });

  const selected = selectedIndex !== null ? feed[selectedIndex] : undefined;

  if (selected) {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold>{KIND_ICON[selected.kind]} {selected.kind} — {selected.topic}</Text>
        <Text>Estimated comprehension: {Math.round(selected.estimatedComprehension * 100)}%</Text>
        <Text>New vocabulary: {selected.newVocabularyCount}</Text>
        <Text>Review vocabulary: {selected.reviewVocabularyCount}</Text>
        <Text>~{selected.estimatedMinutes} min</Text>
        <Box marginTop={1}>
          {selected.kind === "CONVERSATION" && (
            <SelectList items={[{ label: "Start conversation", value: "go" as const }]} onSelect={() => onOpenConversation(selected.topic)} />
          )}
          {(selected.kind === "PODCAST" || selected.kind === "DIALOGUE") && (
            <SelectList items={[{ label: "Start blind listening", value: "go" as const }]} onSelect={() => onOpenBlindListening(selected.topic)} />
          )}
          {selected.kind === "ARTICLE" && (
            <SelectList items={[{ label: "Prepare me for it", value: "go" as const }]} onSelect={() => onOpenMediaPrep(selected.topic)} />
          )}
          {selected.kind === "STORY" && (
            <Text dimColor>Story practice on this topic is available from "Start today's journey" on Home.</Text>
          )}
        </Box>
        <Text dimColor>Esc to go back.</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold>Immersion Feed</Text>
      <SelectList
        items={feed.map((item, index) => ({
          label: `${KIND_ICON[item.kind]} ${item.estimatedMinutes} min ${item.kind.toLowerCase()} — ${item.topic} (${Math.round(item.estimatedComprehension * 100)}% comprehension)`,
          value: index,
        }))}
        onSelect={([value]) => setSelectedIndex(value ?? null)}
      />
      <Text dimColor>Esc to go back.</Text>
    </Box>
  );
}
