# ADR-0006: Socket.io للاتصال الفوري (Realtime)

## الحالة

مقبول

## السياق

"النسخة" تتضمن جلسات تحليل درامي تعاونية وعمليات AI قد تستغرق دقائق. المستخدم يحتاج إلى تحديثات تدريجية (streaming) على حالة العمليات الطويلة بدلًا من انتظار استجابة HTTP واحدة. هناك حاجة لقناتي تواصل:

1. **WebSocket** (ثنائي الاتجاه): للتحديثات التفاعلية الفورية وجلسات التعاون.
2. **Server-Sent Events** (أحادي الاتجاه من الخادوم): لبث تقدم مهام AI والإشعارات.

## القرار

اعتمدنا **Socket.io 4.8.3** في الخادوم مع **socket.io-client 4.8.1** في تطبيق الويب للـ WebSocket، إلى جانب **SSE service** (`sseService`) مُنفَّذ محليًا لبث التحديثات أحادية الاتجاه.

الدليل من الكود:
- `apps/backend/package.json` يتضمن `"socket.io": "^4.8.3"`.
- `apps/web/package.json` يتضمن `"socket.io-client": "^4.8.1"`.
- `apps/backend/src/server.ts` يُنشئ `httpServer = createServer(app)` ثم `websocketService.initialize(httpServer)` لربط Socket.io بنفس خادوم HTTP.
- يستدعي `sseService.shutdown()` و`websocketService.shutdown()` عند SIGTERM وSIGINT، مما يُظهر أنهما خدمتان مُدارتان بشكل صريح.
- سجل التشغيل يؤكد: `{ websocket: 'enabled', sse: 'enabled' }`.

## البدائل المدروسة

| البديل | المزايا | العيوب |
|---|---|---|
| **WebSocket الخام (ws)** | خفيف جدًا، لا abstraction | لا reconnection تلقائي، لا rooms/namespaces، لا fallback لبيئات تمنع WebSocket |
| **SSE فقط** | بسيط، native في المتصفح، يعمل عبر HTTP/2 | أحادي الاتجاه فقط، لا يكفي للجلسات التعاونية |
| **Pusher / Ably** | خدمة مُدارة، لا خادوم خاص | تكلفة شهرية، البيانات تمر عبر طرف ثالث، قيود على الحجم |
| **gRPC Streaming** | أداء ممتاز، type-safe | تعقيد الإعداد، دعم المتصفح محدود، يتطلب Protobuf |

## النتائج

### إيجابية
- **مشاركة منفذ HTTP**: Socket.io يعمل على نفس HTTP server دون فتح منفذ إضافي، مما يُبسّط إعدادات الشبكة والـ firewall.
- **Reconnection تلقائي**: Socket.io يُعيد الاتصال تلقائيًا عند انقطاعه دون تدخل من شيفرة التطبيق.
- **Fallback**: Socket.io يدعم long-polling كبديل احتياطي عند عدم دعم WebSocket في البيئة.
- **Namespaces/Rooms**: تنظيم الاتصالات حسب المشروع أو الجلسة بدون تعقيد.
- **SSE مكمّل**: `sseService` يُوفر بث تدريجي لمخرجات AI بدون الحاجة لاتصال ثنائي الاتجاه.

### سلبية
- **بروتوكول خاص**: بروتوكول Socket.io ليس WebSocket خالصًا؛ العملاء يحتاجون مكتبة Socket.io وليس WebSocket API القياسية.
- **ذاكرة في بيئات متعددة**: إذا تُوسّع الخادوم لعدة نسخ (horizontal scaling)، يجب إضافة Redis Adapter لمشاركة الـ rooms بين النسخ.
- **خدمتان مستقلتان**: إدارة WebSocket وSSE كخدمتين منفصلتين تضيف تعقيدًا في الصيانة والمراقبة.

## الملفات المتأثرة

- `/apps/backend/src/services/websocket.service.ts`
- `/apps/backend/src/services/sse.service.ts`
- `/apps/backend/src/server.ts` (تهيئة وإيقاف الخدمتين)
- `/apps/web/package.json` (socket.io-client)
- `/apps/web/src/` (عميل WebSocket)
