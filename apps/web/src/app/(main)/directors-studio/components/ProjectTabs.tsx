"use client";

/**
 * الصفحة: directors-studio / ProjectTabs
 * الهوية: منطقة تبويب داخلية متسقة مع shell الإخراجي مع مساحات عرض أكثر هدوءًا ووضوحًا
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات PageLayout المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { memo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CharacterTracker from "@/app/(main)/directors-studio/components/CharacterTracker";
import SceneCard from "@/app/(main)/directors-studio/components/SceneCard";
import type {
  CharacterTrackerProps,
  SceneCardProps,
} from "@/app/(main)/directors-studio/helpers/projectSummary";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

interface ProjectTabsProps {
  scenes: SceneCardProps[];
  characters: CharacterTrackerProps["characters"];
}

export function ProjectTabs({ scenes, characters }: ProjectTabsProps) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[28px] border border-white/8 bg-black/18 p-4 backdrop-blur-xl md:p-6">
      <Tabs defaultValue="scenes" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mr-auto bg-white/6 border border-white/8">
          <TabsTrigger value="scenes" data-testid="tab-scenes">
            المشاهد
          </TabsTrigger>
          <TabsTrigger value="characters" data-testid="tab-characters">
            الشخصيات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scenes" className="space-y-4 mt-6">
          <ScenesTabContent scenes={scenes} />
        </TabsContent>

        <TabsContent value="characters" className="mt-6">
          <CharactersTabContent characters={characters} />
        </TabsContent>
      </Tabs>
    </CardSpotlight>
  );
}

interface ScenesTabContentProps {
  scenes: SceneCardProps[];
}

const ScenesTabContent = memo(function ScenesTabContent({
  scenes,
}: ScenesTabContentProps) {
  if (!scenes.length) {
    return (
      <p className="text-center text-white/52 py-12">
        لا توجد مشاهد بعد. قم بتحميل سيناريو للبدء.
      </p>
    );
  }

  return (
    <>
      {scenes.map((scene) => {
        const { status, ...sceneProps } = scene;
        return (
          <SceneCard
            key={scene.id}
            {...sceneProps}
            status={status ?? "planned"}
          />
        );
      })}
    </>
  );
});

interface CharactersTabContentProps {
  characters: CharacterTrackerProps["characters"];
}

const CharactersTabContent = memo(function CharactersTabContent({
  characters,
}: CharactersTabContentProps) {
  if (!characters.length) {
    return (
      <p className="text-center text-white/52 py-12">لا توجد شخصيات بعد.</p>
    );
  }

  return <CharacterTracker characters={characters} />;
});

export default ProjectTabs;
