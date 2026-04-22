# Docker + WSL — إعادة التثبيت النظيفة

مخصص لنظامك: **Windows 11 Pro 26200**، مع Docker Desktop 4.70.0 و WSL متضرر أو عالق في **ترقية ناقصة**. الهدف: حذف كل شيء وتثبيته من جديد مع **إعدادات Docker Desktop الافتراضية على قرص النظام**.

## الملفات

| الملف | الوظيفة | متى تشغّله |
|-------|---------|-----------|
| `00-wsl-system-repair.ps1` | يصلح `C:\Windows\System32\wsl.exe` إذا كان Docker يقول إن WSL يحتاج update بينما نسخة `C:\Program Files\WSL\wsl.exe` تعمل | عند ظهور خطأ `WSL update required` أو `WSL is finishing an upgrade` |
| `01-docker-wsl-uninstall.ps1` | يحذف Docker Desktop + WSL + كل المخلفات | **الآن** (قبل الـ reboot) |
| `02-docker-wsl-install.ps1` | يعيد تثبيت WSL 2 + Docker Desktop بإعدادات التخزين الافتراضية | **بعد الـ reboot** |

كلاهما يتطلب **PowerShell as Administrator**.

---

## الخطوة 1 — الحذف النظيف

افتح **PowerShell as Administrator** (ابحث عن PowerShell → كليك يمين → Run as administrator) وشغّل:

```powershell
cd "e:\yarab we elnby\the copy"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\win\01-docker-wsl-uninstall.ps1
```

### خيارات اختيارية

```powershell
# اعمل نسخة احتياطية من WSL distros قبل حذفها (مفيد لو فيه بيانات داخل Ubuntu)
.\scripts\win\01-docker-wsl-uninstall.ps1 -BackupDistros -BackupPath 'C:\Temp\wsl-backups'

# لا تعطّل Windows features (WSL + VirtualMachinePlatform) إذا كنت تستخدمها لشيء آخر
.\scripts\win\01-docker-wsl-uninstall.ps1 -KeepFeatures

# تجربة بدون تغيير فعلي (dry run)
.\scripts\win\01-docker-wsl-uninstall.ps1 -DryRun
```

بعد انتهاء السكربت: **أعد تشغيل الجهاز**.

---

## الخطوة 2 — التثبيت النظيف

بعد الـ reboot، افتح **PowerShell as Administrator** تاني وشغّل:

```powershell
cd "e:\yarab we elnby\the copy"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\win\02-docker-wsl-install.ps1
```

إذا أوقف السكربت نفسه برسالة تقول إن `System32 WSL is corrupted`، فالمطلوب ليس إعادة المحاولة العشوائية. شغّل أولًا:

```powershell
cd "e:\yarab we elnby\the copy"
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\win\00-wsl-system-repair.ps1
```

هذا السكربت يصلح حالة محددة ثبتت في سجلات Docker:

- `C:\Program Files\WSL\wsl.exe` يعمل.
- `C:\Windows\System32\wsl.exe` يفشل برسالة `WSL is finishing an upgrade...`.
- Docker Desktop يستدعي **نسخة System32 تحديدًا**، لذلك لن ينفع الاكتفاء بأن نسخة Program Files تعمل.

إذا أوقف السكربت نفسه برسالة تطلب **reboot**، فهذا سلوك صحيح وليس فشلًا صامتًا:

- معناه أن ويندوز ما زال لديه **pending reboot** بعد تفعيل خصائص WSL.
- أعد تشغيل الجهاز مرة أخرى.
- شغّل **نفس الأمر نفسه** بعد الدخول للنظام.

### خيارات اختيارية

```powershell
# غيّر مكان البيانات فقط إذا احتجت تخصيصًا يدويًا
.\scripts\win\02-docker-wsl-install.ps1 -DataRoot 'F:\MyDockerFolder'

# ثبّت WSL distro مع التثبيت (اختياري — Docker Desktop ما يحتاجش distro خاص)
.\scripts\win\02-docker-wsl-install.ps1 -WslDistro 'Ubuntu-22.04'

# اكتفِ بالتثبيت بدون فتح Docker Desktop (للتشغيل اليدوي لاحقاً)
.\scripts\win\02-docker-wsl-install.ps1 -SkipDockerLaunch
```

---

## ما يحدث خلف الكواليس

### Uninstall (السكربت 1)

1. يوقف كل عمليات Docker وخدماته + `wsl --shutdown`.
2. يعمل `wsl --unregister` لكل distro (مع backup اختياري أولاً).
3. `wsl --uninstall` (Windows 11 يدعمه).
4. `winget uninstall Docker.DockerDesktop`.
5. `Remove-AppxPackage` لمتجر Ubuntu + WindowsSubsystemForLinux.
6. `Disable-WindowsOptionalFeature` لـ `Microsoft-Windows-Subsystem-Linux` و `VirtualMachinePlatform` (اختياري).
7. يحذف كل المجلدات المتبقية:
   - `C:\ProgramData\Docker`, `C:\ProgramData\DockerDesktop`
   - `C:\Program Files\Docker`
   - `%LOCALAPPDATA%\Docker`, `%USERPROFILE%\.docker`
   - AppX packages folders
   - Registry: `HKCU:\Software\Microsoft\Windows\CurrentVersion\Lxss`

### Install (السكربت 2)

1. يتحقق من قرص النظام (>= 20 GB حر).
2. يستخدم إعدادات Docker Desktop الافتراضية على قرص النظام.
3. `Enable-WindowsOptionalFeature` للـ WSL و VirtualMachinePlatform.
4. إذا كان هناك **pending reboot** يتوقف السكربت فورًا ويطلب إعادة تشغيل قبل أي خطوة تخص `wsl`.
5. `wsl --install --no-distribution` + `wsl --update` + `wsl --set-default-version 2` + `wsl --version`.
6. `winget download Docker.DockerDesktop` ثم تشغيل المثبت مباشرة بالوسائط الصحيحة:
   ```powershell
   install --quiet --accept-license --backend=wsl-2
   ```
7. يكتب `%APPDATA%\Docker\settings-store.json` بإعدادات محسّنة:
   ```json
   {
     "wslEngineEnabled": true,
      "useWindowsContainers": false
   }
   ```
8. يفتح Docker Desktop ويتحقق عبر `docker info` حتى يصبح الـ engine `linux`.

### Repair (السكربت 0)

1. يشخّص الفرق بين:
   - `C:\Windows\System32\wsl.exe`
   - `C:\Program Files\WSL\wsl.exe`
2. يوقف Docker Desktop وعمليات WSL العالقة.
3. يشغّل:
   ```powershell
   DISM /Online /Cleanup-Image /RestoreHealth
   sfc /scannow
   ```
4. يصلح تسجيل WSL عبر:
   - `msiexec /fvomus {ProductCode}`
   - `winget repair Microsoft.WSL`
   - `Reset-AppxPackage` و `Add-AppxPackage -Register` إذا لزم
5. يتحقق أن:
   ```powershell
   C:\Windows\System32\wsl.exe --version
   C:\Windows\System32\wsl.exe --set-default-version 2
   ```
   يعملان بدون خطأ ترقية.
6. ينظّف `settings-store.json` من المفتاح غير المدعوم `wslEngineCustomImagePath`.
7. يفتح Docker Desktop ويتحقق حيًا أن:
   ```powershell
   docker info --format "{{.OSType}}"
   ```
   يعيد `linux`.

---

## التحقق بعد الانتهاء

```powershell
docker --version
docker info --format "{{.OSType}}"        # يجب أن يطبع: linux
wsl --version
wsl -l -v                                 # يجب أن يسرد distros موجودة (بعد Docker Desktop)
docker info --format "{{.DockerRootDir}}"

# اختبار فعلي
cd "e:\yarab we elnby\the copy"
pnpm infra:up
```

---

## ملاحظات مهمة

1. **Docker Desktop v4.70 → أحدث إصدار**: winget هيثبت أحدث نسخة. لو تريد النسخة السابقة بالضبط، اذكرها: `winget install Docker.DockerDesktop --version 4.70.0.0`.
2. **لو استخدمت سكربت الحذف بدون `-KeepFeatures`** فالغالب أنك ستحتاج reboot إضافي أثناء مرحلة التثبيت. السكربت الآن يوقف نفسه بدل أن يكمل على حالة ويندوز غير مستقرة.
3. **الـ Defender exclusions** اللي ضفناها ساعات سابقة (`E:\yarab we elnby\the copy` + `C:\pnpm-store`) تبقى كما هي.
5. **الـ backend والـ frontend** الحاليين سيعملان في **degraded mode** (بدون DB/Redis) حتى ينتهي التثبيت. لا تشغّل `pnpm start:fresh` خلال العملية.
6. **لو ظهر في سجل Docker** سطر شبيه بـ:
   ```text
   c:\windows\system32\wsl.exe --version failed: ... WSL is finishing an upgrade...
   ```
   فده يؤكد أن المشكلة في نسخة `System32` نفسها، وليس في السكربت فقط.
