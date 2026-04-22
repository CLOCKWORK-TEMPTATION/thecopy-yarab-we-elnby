export const swaggerSchemas = {
  Error: {
    type: 'object',
    properties: {
      success: {
        type: 'boolean',
        example: false,
      },
      error: {
        type: 'string',
        example: 'حدث خطأ في الخادم',
      },
    },
  },
  User: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440000' },
      email: { type: 'string', format: 'email', example: 'user@example.com' },
      firstName: { type: 'string', example: 'أحمد' },
      lastName: { type: 'string', example: 'محمد' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Project: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      title: { type: 'string', example: 'مشروع فيلم جديد' },
      scriptContent: { type: 'string', example: 'FADE IN:\n\nEXT. PARK - DAY\n\n...' },
      userId: { type: 'string', format: 'uuid' },
      createdAt: { type: 'string', format: 'date-time' },
      updatedAt: { type: 'string', format: 'date-time' },
    },
  },
  Scene: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid' },
      sceneNumber: { type: 'integer', example: 1 },
      title: { type: 'string', example: 'مشهد الحديقة' },
      location: { type: 'string', example: 'EXT. PARK' },
      timeOfDay: { type: 'string', example: 'DAY' },
      characters: { type: 'array', items: { type: 'string' }, example: ['محمد', 'سارة'] },
      description: { type: 'string', example: 'يلتقي البطل بالشخصية الثانوية' },
      shotCount: { type: 'integer', example: 5 },
      status: { type: 'string', enum: ['planned', 'in_progress', 'completed'], example: 'planned' },
    },
  },
  Character: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      projectId: { type: 'string', format: 'uuid' },
      name: { type: 'string', example: 'محمد' },
      appearances: { type: 'integer', example: 10 },
      consistencyStatus: { type: 'string', enum: ['good', 'warning', 'error'], example: 'good' },
      lastSeen: { type: 'string', example: 'Scene 5' },
      notes: { type: 'string', example: 'يرتدي قميصاً أزرق' },
    },
  },
  Shot: {
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid' },
      sceneId: { type: 'string', format: 'uuid' },
      shotNumber: { type: 'integer', example: 1 },
      shotType: { type: 'string', example: 'WIDE SHOT' },
      cameraAngle: { type: 'string', example: 'EYE LEVEL' },
      cameraMovement: { type: 'string', example: 'STATIC' },
      lighting: { type: 'string', example: 'NATURAL DAYLIGHT' },
      aiSuggestion: { type: 'string', example: 'استخدم لقطة واسعة لإظهار المكان' },
    },
  },
};

export const swaggerResponses = {
  UnauthorizedError: {
    description: 'غير مصرح - يرجى تسجيل الدخول',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: { success: false, error: 'غير مصرح - يرجى تسجيل الدخول' },
      },
    },
  },
  NotFoundError: {
    description: 'المورد غير موجود',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: { success: false, error: 'المورد غير موجود' },
      },
    },
  },
  RateLimitError: {
    description: 'تم تجاوز الحد المسموح من الطلبات',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: { success: false, error: 'تم تجاوز الحد المسموح من الطلبات، يرجى المحاولة لاحقاً' },
      },
    },
  },
  ServerError: {
    description: 'خطأ في الخادم',
    content: {
      'application/json': {
        schema: { $ref: '#/components/schemas/Error' },
        example: { success: false, error: 'حدث خطأ داخلي في الخادم' },
      },
    },
  },
};
