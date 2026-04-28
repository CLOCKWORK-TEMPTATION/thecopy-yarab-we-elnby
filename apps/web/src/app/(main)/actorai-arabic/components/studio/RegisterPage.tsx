"use client";

import { useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface RegisterPageProps {
  onRegister: (name: string, email: string, password: string) => void;
  onNavigate: (view: any) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({
  onRegister,
  onNavigate,
}) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <CardSpotlight className="w-full max-w-md overflow-hidden rounded-[22px] backdrop-blur-xl">
        <Card className="w-full max-w-md border-0">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🎭</div>
            <CardTitle className="text-2xl">إنشاء حساب جديد</CardTitle>
            <CardDescription>انضم إلينا وابدأ رحلة التطوير</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">الاسم الكامل</Label>
              <Input
                id="name"
                placeholder="أحمد محمد"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">البريد الإلكتروني</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              className="w-full"
              onClick={() => onRegister(name, email, password)}
            >
              إنشاء الحساب
            </Button>
            <p className="text-sm text-white/55">
              لديك حساب بالفعل؟{" "}
              <button
                onClick={() => onNavigate("login")}
                className="text-blue-600 hover:underline"
              >
                سجل دخولك
              </button>
            </p>
          </CardFooter>
        </Card>
      </CardSpotlight>
    </div>
  );
};
