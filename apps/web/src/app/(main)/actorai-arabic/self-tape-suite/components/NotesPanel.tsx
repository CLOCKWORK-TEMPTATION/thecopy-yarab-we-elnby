"use client";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NOTE_TYPE_COLOR, NOTE_TYPE_LABELS } from "./constants";
import { formatTime, getScoreColor, getSeverityContainerClass } from "./utils";
import type { NoteType, Take } from "./types";

interface NotesPanelProps {
  availableTakes: Take[];
  notesTakeId: string | null;
  setNotesTakeId: (takeId: string | null) => void;
  manualNoteDrafts: Record<string, string>;
  setManualNoteDrafts: (
    drafts:
      | Record<string, string>
      | ((prev: Record<string, string>) => Record<string, string>)
  ) => void;
  manualNoteTypes: Record<string, NoteType>;
  setManualNoteTypes: (
    types:
      | Record<string, NoteType>
      | ((prev: Record<string, NoteType>) => Record<string, NoteType>)
  ) => void;
  addManualNote: (takeId: string) => void;
}

export const NotesPanel: React.FC<NotesPanelProps> = ({
  availableTakes,
  notesTakeId,
  setNotesTakeId,
  manualNoteDrafts,
  setManualNoteDrafts,
  manualNoteTypes,
  setManualNoteTypes,
  addManualNote,
}) => {
  return (
    <CardSpotlight className="overflow-hidden rounded-[22px] bg-black/18 border-purple-500/30">
      <Card className="bg-black/18 border-purple-500/30 bg-transparent">
        <CardHeader>
          <CardTitle className="text-white">
            📝 الملاحظات وتحسين الأداء
          </CardTitle>
          <CardDescription className="text-purple-300">
            الملاحظات التلقائية تُبنى من نتيجة التسجيل، ويمكنك إضافة ملاحظاتك
            اليدوية فوقها.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {availableTakes.length > 0 ? (
            <Tabs
              value={notesTakeId ?? availableTakes[0]?.id ?? ""}
              onValueChange={(value) => setNotesTakeId(value)}
            >
              <TabsList className="mb-4 h-auto flex-wrap gap-2 border border-purple-500/30 bg-black/14 p-2">
                {availableTakes.map((take) => (
                  <TabsTrigger
                    key={take.id}
                    value={take.id}
                    className="text-white data-[state=active]:bg-purple-600"
                  >
                    {take.name}
                  </TabsTrigger>
                ))}
              </TabsList>

              {availableTakes.map((take) => (
                <TabsContent key={take.id} value={take.id}>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                      <div className="rounded-xl bg-black/14 p-4 text-center">
                        <p className="text-sm text-white/55">التقييم العام</p>
                        <p
                          className={`text-3xl font-bold ${getScoreColor(take.score)}`}
                        >
                          {take.score ?? 0}%
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/14 p-4 text-center">
                        <p className="text-sm text-white/55">إيجابي</p>
                        <p className="text-3xl font-bold text-green-400">
                          {
                            take.notes.filter(
                              (note) => note.severity === "positive"
                            ).length
                          }
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/14 p-4 text-center">
                        <p className="text-sm text-white/55">
                          تحتاج تحسين
                        </p>
                        <p className="text-3xl font-bold text-yellow-400">
                          {
                            take.notes.filter(
                              (note) => note.severity === "needs_work"
                            ).length
                          }
                        </p>
                      </div>
                      <div className="rounded-xl bg-black/14 p-4 text-center">
                        <p className="text-sm text-white/55">المدة</p>
                        <p className="text-3xl font-bold text-purple-400">
                          {formatTime(take.duration)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {take.notes.map((note) => (
                        <div
                          key={note.id}
                          className={`rounded-xl border p-4 ${getSeverityContainerClass(note.severity)}`}
                        >
                          <div className="mb-2 flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <Badge className={NOTE_TYPE_COLOR[note.type]}>
                                {NOTE_TYPE_LABELS[note.type]}
                              </Badge>
                              <span className="text-sm text-white/55">
                                @{formatTime(note.timestamp)}
                              </span>
                            </div>
                            <Badge
                              variant="outline"
                              className="border-purple-500/50 text-purple-300"
                            >
                              {note.autoGenerated ? "محلي" : "يدوي"}
                            </Badge>
                          </div>
                          <p className="text-white">{note.content}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-purple-500/30 bg-black/14 p-4">
                      <Label className="mb-3 block text-purple-300">
                        أضف ملاحظة يدوية
                      </Label>
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-[220px_1fr_auto]">
                        <Select
                          value={manualNoteTypes[take.id] ?? "improvement"}
                          onValueChange={(value) =>
                            setManualNoteTypes((previous) => ({
                              ...previous,
                              [take.id]: value as NoteType,
                            }))
                          }
                        >
                          <SelectTrigger className="border-purple-500/30 bg-black/18 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-purple-500/30 bg-black/14">
                            {Object.entries(NOTE_TYPE_LABELS).map(
                              ([value, label]) => (
                                <SelectItem
                                  key={value}
                                  value={value}
                                  className="text-white"
                                >
                                  {label}
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>

                        <Input
                          value={manualNoteDrafts[take.id] ?? ""}
                          onChange={(event) =>
                            setManualNoteDrafts((previous) => ({
                              ...previous,
                              [take.id]: event.target.value,
                            }))
                          }
                          placeholder="اكتب الملاحظة التي تريد حفظها مع هذا التسجيل"
                          className="border-purple-500/30 bg-black/18 text-white"
                        />

                        <Button
                          className="bg-purple-600 text-white hover:bg-purple-700"
                          onClick={() => addManualNote(take.id)}
                        >
                          إضافة
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            <div className="py-12 text-center text-white/55">
              لا توجد تسجيلات لعرض ملاحظاتها بعد.
            </div>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
};
