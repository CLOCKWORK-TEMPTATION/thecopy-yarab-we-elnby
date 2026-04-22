"use client";

import { useState } from "react";
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
import { useApp } from "../../context/AppContext";

export function LoginForm() {
  const { handleLogin, navigate } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md bg-white/[0.04] border-white/8">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🎭</div>
          <CardTitle className="text-2xl text-white">تسجيل الدخول</CardTitle>
          <CardDescription className="text-white/68">
            سجل دخولك للوصول إلى حسابك
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login-email" className="text-white">
              البريد الإلكتروني
            </Label>
            <Input
              id="login-email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="bg-white/6 border-white/8 text-white placeholder:text-white/45"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password" className="text-white">
              كلمة المرور
            </Label>
            <Input
              id="login-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/6 border-white/8 text-white placeholder:text-white/45"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={() => handleLogin(email, password)}
          >
            تسجيل الدخول
          </Button>
          <p className="text-sm text-white/68">
            ليس لديك حساب؟{" "}
            <button
              onClick={() => navigate("register")}
              className="text-blue-400 hover:underline"
            >
              سجل الآن
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export function RegisterForm() {
  const { handleRegister, navigate } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <Card className="w-full max-w-md bg-white/[0.04] border-white/8">
        <CardHeader className="text-center">
          <div className="text-6xl mb-4">🎭</div>
          <CardTitle className="text-2xl text-white">إنشاء حساب جديد</CardTitle>
          <CardDescription className="text-white/68">
            انضم إلينا وابدأ رحلة التطوير
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="register-name" className="text-white">
              الاسم الكامل
            </Label>
            <Input
              id="register-name"
              placeholder="أحمد محمد"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-white/6 border-white/8 text-white placeholder:text-white/45"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-email" className="text-white">
              البريد الإلكتروني
            </Label>
            <Input
              id="register-email"
              type="email"
              placeholder="example@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              dir="ltr"
              className="bg-white/6 border-white/8 text-white placeholder:text-white/45"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="register-password" className="text-white">
              كلمة المرور
            </Label>
            <Input
              id="register-password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-white/6 border-white/8 text-white placeholder:text-white/45"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            className="w-full"
            onClick={() => handleRegister(name, email, password)}
          >
            إنشاء الحساب
          </Button>
          <p className="text-sm text-white/68">
            لديك حساب بالفعل؟{" "}
            <button
              onClick={() => navigate("login")}
              className="text-blue-400 hover:underline"
            >
              سجل دخولك
            </button>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
