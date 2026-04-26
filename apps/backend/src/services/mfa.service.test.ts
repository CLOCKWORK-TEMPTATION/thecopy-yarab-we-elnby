import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { authMock, qrMock, dbSelectMock, dbUpdateMock } = vi.hoisted(() => ({
  authMock: {
    options: {},
    generateSecret: vi.fn(),
    keyuri: vi.fn(),
    verify: vi.fn(),
  },
  qrMock: {
    toDataURL: vi.fn(),
  },
  dbSelectMock: vi.fn(),
  dbUpdateMock: vi.fn(),
}));

vi.mock('otplib', () => ({ authenticator: authMock }));
vi.mock('qrcode', () => qrMock);
vi.mock('@/db', () => ({
  db: {
    select: dbSelectMock,
    update: dbUpdateMock,
  },
}));
vi.mock('@/db/schema', () => ({
  users: {},
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field: unknown, value: unknown) => ({ field, value })),
}));

import { MFAService, mfaService } from './mfa.service';

interface MockUser {
  id: string;
  email: string;
  mfaEnabled: boolean;
  mfaSecret: string | null;
}

function buildSelectChain(rows: MockUser[]): {
  from: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
} {
  return {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
}

function buildUpdateChain(): {
  set: ReturnType<typeof vi.fn>;
  where: ReturnType<typeof vi.fn>;
} {
  return {
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue(undefined),
  };
}

let service: MFAService;

beforeEach(() => {
  vi.clearAllMocks();
  service = new MFAService();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('MFAService > enableMFA', () => {
  it('should enable MFA and return setup data', async () => {
    const userId = 'user-123';
    const mockUser: MockUser = {
      id: userId,
      email: 'test@example.com',
      mfaEnabled: false,
      mfaSecret: null,
    };

    const mockSecret = 'ABCDEFGHIJKLMNOP';
    const mockOtpAuthUrl =
      'otpauth://totp/TheCopy:test@example.com?secret=ABCDEFGHIJKLMNOP&issuer=TheCopy';
    const mockQrCode = 'data:image/png;base64,iVBORw0KGgo...';

    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    dbUpdateMock.mockReturnValue(buildUpdateChain());

    authMock.generateSecret.mockReturnValue(mockSecret);
    authMock.keyuri.mockReturnValue(mockOtpAuthUrl);
    qrMock.toDataURL.mockResolvedValue(mockQrCode);

    const result = await service.enableMFA(userId);

    expect(result).toEqual({
      secret: mockSecret,
      qrCodeDataUrl: mockQrCode,
      otpauthUrl: mockOtpAuthUrl,
    });

    expect(authMock.generateSecret).toHaveBeenCalled();
    expect(authMock.keyuri).toHaveBeenCalledWith(mockUser.email, 'TheCopy', mockSecret);
    expect(qrMock.toDataURL).toHaveBeenCalledWith(mockOtpAuthUrl);
  });

  it('should throw error if user not found', async () => {
    dbSelectMock.mockReturnValue(buildSelectChain([]));
    await expect(service.enableMFA('nonexistent')).rejects.toThrow('المستخدم غير موجود');
  });

  it('should throw error if MFA already enabled', async () => {
    const mockUser: MockUser = {
      id: 'user-123',
      email: 'test@example.com',
      mfaEnabled: true,
      mfaSecret: 'existing-secret',
    };
    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    await expect(service.enableMFA('user-123')).rejects.toThrow(
      'المصادقة الثنائية مفعلة بالفعل'
    );
  });
});

describe('MFAService > verifyMFA', () => {
  it('should verify valid token and enable MFA for first-time setup', async () => {
    const userId = 'user-123';
    const token = '123456';
    const mockUser: MockUser = {
      id: userId,
      email: 'test@example.com',
      mfaEnabled: false,
      mfaSecret: 'ABCDEFGHIJKLMNOP',
    };

    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    dbUpdateMock.mockReturnValue(buildUpdateChain());
    authMock.verify.mockReturnValue(true);

    const result = await service.verifyMFA(userId, token);

    expect(result).toEqual({
      success: true,
      message: 'تم التحقق بنجاح',
    });
    expect(dbUpdateMock).toHaveBeenCalled();
  });

  it('should verify valid token for already-enabled MFA', async () => {
    const userId = 'user-123';
    const token = '123456';
    const mockUser: MockUser = {
      id: userId,
      email: 'test@example.com',
      mfaEnabled: true,
      mfaSecret: 'ABCDEFGHIJKLMNOP',
    };

    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    authMock.verify.mockReturnValue(true);

    const result = await service.verifyMFA(userId, token);

    expect(result.success).toBe(true);
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it('should return failure for invalid token', async () => {
    const userId = 'user-123';
    const token = '000000';
    const mockUser: MockUser = {
      id: userId,
      email: 'test@example.com',
      mfaEnabled: true,
      mfaSecret: 'ABCDEFGHIJKLMNOP',
    };

    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    authMock.verify.mockReturnValue(false);

    const result = await service.verifyMFA(userId, token);

    expect(result).toEqual({
      success: false,
      message: 'رمز التحقق غير صحيح',
    });
  });

  it('should throw error if user not found', async () => {
    dbSelectMock.mockReturnValue(buildSelectChain([]));
    await expect(service.verifyMFA('nonexistent', '123456')).rejects.toThrow(
      'المستخدم غير موجود'
    );
  });

  it('should throw error if MFA not setup', async () => {
    const mockUser: MockUser = {
      id: 'user-123',
      email: 'test@example.com',
      mfaEnabled: false,
      mfaSecret: null,
    };
    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    await expect(service.verifyMFA('user-123', '123456')).rejects.toThrow(
      'لم يتم إعداد المصادقة الثنائية'
    );
  });
});

describe('MFAService > disableMFA', () => {
  it('should disable MFA successfully', async () => {
    const userId = 'user-123';
    const mockUser: MockUser = {
      id: userId,
      email: 'test@example.com',
      mfaEnabled: true,
      mfaSecret: 'ABCDEFGHIJKLMNOP',
    };

    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    const updateChain = buildUpdateChain();
    dbUpdateMock.mockReturnValue(updateChain);

    await service.disableMFA(userId);

    expect(dbUpdateMock).toHaveBeenCalled();
    expect(updateChain.set).toHaveBeenCalledWith({
      mfaEnabled: false,
      mfaSecret: null,
      updatedAt: expect.any(Date) as unknown,
    });
  });

  it('should throw error if user not found', async () => {
    dbSelectMock.mockReturnValue(buildSelectChain([]));
    await expect(service.disableMFA('nonexistent')).rejects.toThrow('المستخدم غير موجود');
  });

  it('should throw error if MFA not enabled', async () => {
    const mockUser: MockUser = {
      id: 'user-123',
      email: 'test@example.com',
      mfaEnabled: false,
      mfaSecret: null,
    };
    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    await expect(service.disableMFA('user-123')).rejects.toThrow(
      'المصادقة الثنائية غير مفعلة'
    );
  });
});

describe('MFAService > isMFAEnabled', () => {
  it('should return true if MFA is enabled', async () => {
    const mockUser: MockUser = {
      id: 'user-123',
      email: 'test@example.com',
      mfaEnabled: true,
      mfaSecret: null,
    };
    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    expect(await service.isMFAEnabled('user-123')).toBe(true);
  });

  it('should return false if MFA is not enabled', async () => {
    const mockUser: MockUser = {
      id: 'user-123',
      email: 'test@example.com',
      mfaEnabled: false,
      mfaSecret: null,
    };
    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    expect(await service.isMFAEnabled('user-123')).toBe(false);
  });

  it('should throw error if user not found', async () => {
    dbSelectMock.mockReturnValue(buildSelectChain([]));
    await expect(service.isMFAEnabled('nonexistent')).rejects.toThrow('المستخدم غير موجود');
  });
});

describe('MFAService > validateToken', () => {
  it('should return true for valid token', async () => {
    const mockUser: MockUser = {
      id: 'user-123',
      email: 'test@example.com',
      mfaEnabled: true,
      mfaSecret: 'ABCDEFGHIJKLMNOP',
    };
    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    authMock.verify.mockReturnValue(true);
    expect(await service.validateToken('user-123', '123456')).toBe(true);
  });

  it('should return false for invalid token', async () => {
    const mockUser: MockUser = {
      id: 'user-123',
      email: 'test@example.com',
      mfaEnabled: true,
      mfaSecret: 'ABCDEFGHIJKLMNOP',
    };
    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    authMock.verify.mockReturnValue(false);
    expect(await service.validateToken('user-123', '000000')).toBe(false);
  });

  it('should return false if user not found', async () => {
    dbSelectMock.mockReturnValue(buildSelectChain([]));
    expect(await service.validateToken('nonexistent', '123456')).toBe(false);
  });

  it('should return false if MFA not enabled', async () => {
    const mockUser: MockUser = {
      id: 'user-123',
      email: 'test@example.com',
      mfaEnabled: false,
      mfaSecret: null,
    };
    dbSelectMock.mockReturnValue(buildSelectChain([mockUser]));
    expect(await service.validateToken('user-123', '123456')).toBe(false);
  });
});

describe('MFAService > singleton export', () => {
  it('should export a singleton instance', () => {
    expect(mfaService).toBeDefined();
    expect(mfaService).toBeInstanceOf(MFAService);
  });
});
