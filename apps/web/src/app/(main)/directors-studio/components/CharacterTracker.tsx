"use client";

/**
 * الصفحة: directors-studio / CharacterTracker
 * الهوية: متتبع شخصيات داخل بيئة إخراجية زجاجية موحدة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات PageLayout المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { memo, useMemo, type ReactElement } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Eye } from "lucide-react";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

type ConsistencyStatus = "good" | "warning" | "issue";

interface Character {
  id: string;
  name: string;
  appearances: number;
  consistencyStatus: ConsistencyStatus;
  lastSeen: string;
}

interface CharacterTrackerProps {
  characters: Character[];
}

const STATUS_ICONS: Record<ConsistencyStatus, ReactElement> = {
  good: <CheckCircle2 className="w-4 h-4 text-[var(--page-accent)]" />,
  warning: <AlertCircle className="w-4 h-4 text-white/55" />,
  issue: <AlertCircle className="w-4 h-4 text-destructive" />,
};

const STATUS_LABELS: Record<ConsistencyStatus, string> = {
  good: "متسق",
  warning: "تحذير",
  issue: "مشكلة",
};

const CharacterItem = memo(function CharacterItem({
  character,
}: {
  character: Character;
}) {
  const statusIcon = useMemo(
    () => STATUS_ICONS[character.consistencyStatus],
    [character.consistencyStatus]
  );

  const statusLabel = useMemo(
    () => STATUS_LABELS[character.consistencyStatus],
    [character.consistencyStatus]
  );

  const avatarInitial = useMemo(
    () => character.name.charAt(0),
    [character.name]
  );

  return (
    <CardSpotlight className="overflow-hidden rounded-[24px] border border-white/8 bg-black/20 p-4 backdrop-blur-xl">
      <div
        className="flex items-center gap-4"
        data-testid={`character-${character.id}`}
      >
        <Button
          size="icon"
          variant="ghost"
          data-testid={`button-view-${character.id}`}
        >
          <Eye className="w-4 h-4" />
        </Button>

        <div className="flex-1 text-right space-y-2">
          <div className="flex items-center justify-end gap-2">
            <div className="flex items-center gap-2">
              {statusIcon}
              <Badge
                variant="secondary"
                className="text-xs bg-white/8 text-white/85"
              >
                {statusLabel}
              </Badge>
            </div>
            <h4 className="font-semibold text-white">{character.name}</h4>
          </div>

          <div className="flex items-center justify-end gap-4 text-sm text-white/55 flex-wrap">
            <span>{character.lastSeen}</span>
            <span>•</span>
            <span>{character.appearances} ظهور</span>
          </div>
        </div>

        <Avatar className="w-12 h-12 border border-white/10">
          <AvatarFallback className="text-lg font-semibold bg-white/8 text-white">
            {avatarInitial}
          </AvatarFallback>
        </Avatar>
      </div>
    </CardSpotlight>
  );
});

function CharacterTracker({ characters }: CharacterTrackerProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/18 p-5 backdrop-blur-xl">
      <div data-testid="card-character-tracker" className="space-y-5">
        <div className="text-right">
          <h3 className="text-xl font-semibold text-white">متابعة الشخصيات</h3>
          <p className="mt-2 text-sm text-white/55">
            تتبع الظهور، الاتساق، وآخر تموضع درامي للشخصيات.
          </p>
        </div>

        <div className="space-y-4">
          {characters.map((character) => (
            <CharacterItem key={character.id} character={character} />
          ))}
        </div>
      </div>
    </CardSpotlight>
  );
}

export default memo(CharacterTracker);
