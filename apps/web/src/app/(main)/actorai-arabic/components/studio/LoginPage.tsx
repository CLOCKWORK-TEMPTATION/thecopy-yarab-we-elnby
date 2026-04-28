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

import type { ViewType } from "../../types";

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  onNavigate: (view: ViewType) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  onNavigate,
}) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <CardSpotlight className="w-full max-w-md overflow-hidden rounded-[22px] backdrop-blur-xl">
        <Card className="w-full max-w-md border-0">
          <CardHeader className="text-center">
            <div className="text-6xl mb-4">🎭</div>
            <CardTitle className="text-2xl">تسجيل الدخول</CardTitle>
            <CardDescription>سجل دخولك للوصول إلى حسابك</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
            <Button className="w-full" onClick={() => onLogin(email, password)}>
              تسجيل الدخول
            </Button>
            <p className="text-sm text-white/55">
              ليس لديك حساب؟{" "}
              <button
                onClick={() => onNavigate("register")}
                className="text-blue-600 hover:underline"
              >
                سجل الآن
              </button>
            </p>
          </CardFooter>
        </Card>
      </CardSpotlight>
    </div>
  );
};
