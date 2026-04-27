import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import type { BudgetAnalysis } from "../../types";

export function BudgetAnalysisPanel({
  analysis,
}: {
  analysis: BudgetAnalysis | null;
}) {
  return (
    <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
      <Card className="border-0 bg-transparent shadow-none">
        <CardHeader>
          <CardTitle className="text-white">ملخص التحليل</CardTitle>
          <CardDescription className="text-white/52">
            ناتج `/api/budget/analyze`
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {analysis ? (
            <>
              <p className="text-sm leading-7 text-white/82">
                {analysis.summary}
              </p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
                  <p className="text-xs text-white/42">أيام التصوير</p>
                  <p className="mt-2 text-2xl font-semibold text-white">
                    {analysis.shootingSchedule.totalDays}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
                  <p className="text-xs text-white/42">التقسيم المرحلي</p>
                  <p className="mt-2 text-sm leading-7 text-white/82">
                    ما قبل الإنتاج{" "}
                    {analysis.shootingSchedule.phases.preProduction} يوم
                    <br />
                    الإنتاج {analysis.shootingSchedule.phases.production} يوم
                    <br />
                    ما بعد الإنتاج{" "}
                    {analysis.shootingSchedule.phases.postProduction} يوم
                  </p>
                </div>
              </div>
              <div className="grid gap-4">
                <SectionList title="التوصيات" items={analysis.recommendations} />
                <SectionList title="عوامل المخاطر" items={analysis.riskFactors} />
                <SectionList
                  title="فرص خفض التكلفة"
                  items={analysis.costOptimization}
                />
              </div>
            </>
          ) : (
            <p
              data-testid="budget-analysis-empty"
              className="text-sm text-white/52"
            >
              لم يُنفذ التحليل بعد.
            </p>
          )}
        </CardContent>
      </Card>
    </CardSpotlight>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      {items.length ? (
        <ul className="space-y-2 text-sm text-white/68">
          {items.map((item) => (
            <li key={`${title}-${item}`} className="leading-6">
              • {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/45">لا توجد عناصر متاحة.</p>
      )}
    </div>
  );
}
