"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { platformApps } from "@/config/apps.config";

export function AppGrid() {
  return (
    <div className="container mx-auto px-4 py-16" dir="rtl">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4">منصة الإنتاج السينمائي</h1>
        <p className="text-xl text-gray-400">اختر التطبيق المناسب لعملك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {platformApps.map((app, index) => (
          <motion.div
            key={app.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={app.path}>
              <Card
                className={`h-full cursor-pointer hover:scale-105 transition-all duration-300 bg-gradient-to-br ${app.color} border-0`}
              >
                <CardHeader className="text-center">
                  <div className="text-6xl mb-4">{app.icon}</div>
                  <CardTitle className="text-white text-xl mb-2">
                    {app.nameAr}
                  </CardTitle>
                  <CardDescription className="text-white/80 text-sm">
                    {app.description}
                  </CardDescription>
                  {app.badge && (
                    <span className="inline-block mt-3 px-3 py-1 bg-white/20 rounded-full text-xs text-white">
                      {app.badge}
                    </span>
                  )}
                </CardHeader>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
