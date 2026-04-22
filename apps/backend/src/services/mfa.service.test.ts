import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { authenticator } from 'otplib';

// Mock dependencies
vi.mock('otplib', () => ({
  authenticator: {
    options: {},
    generateSecret: vi.fn(),
    keyuri: vi.fn(),
    verify: vi.fn(),
  },
}));

vi.mock('qrcode', () => ({
  toDataURL: vi.fn(),
}));

vi.mock('@/db', () => ({
  db: {
    select: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/db/schema', () => ({
  users: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((field, value) => ({ field, value })),
}));

import { MFAService, mfaService } from './mfa.service';
import { db } from '@/db';
import * as QRCode from 'qrcode';

describe('MFAService', () => {
  let service: MFAService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new MFAService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('enableMFA', () => {
    it('should enable MFA and return setup data', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        mfaEnabled: false,
        mfaSecret: null,
      };

      const mockSecret = 'ABCDEFGHIJKLMNOP';
      const mockOtpAuthUrl = 'otpauth://totp/TheCopy:test@example.com?secret=ABCDEFGHIJKLMNOP&issuer=TheCopy';
      const mockQrCode = 'data:image/png;base64,iVBORw0KGgo...';

      // Mock db.select
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      // Mock db.update
      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      (db.update as any).mockReturnValue(mockUpdateChain);

      // Mock authenticator
      vi.mocked(authenticator.generateSecret).mockReturnValue(mockSecret);
      vi.mocked(authenticator.keyuri).mockReturnValue(mockOtpAuthUrl);

      // Mock QRCode
      vi.mocked(QRCode.toDataURL).mockResolvedValue(mockQrCode);

      const result = await service.enableMFA(userId);

      expect(result).toEqual({
        secret: mockSecret,
        qrCodeDataUrl: mockQrCode,
        otpauthUrl: mockOtpAuthUrl,
      });

      expect(authenticator.generateSecret).toHaveBeenCalled();
      expect(authenticator.keyuri).toHaveBeenCalledWith(mockUser.email, 'TheCopy', mockSecret);
      expect(QRCode.toDataURL).toHaveBeenCalledWith(mockOtpAuthUrl);
    });

    it('should throw error if user not found', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      await expect(service.enableMFA('nonexistent')).rejects.toThrow('المستخدم غير موجود');
    });

    it('should throw error if MFA already enabled', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: true,
        mfaSecret: 'existing-secret',
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      await expect(service.enableMFA('user-123')).rejects.toThrow('المصادقة الثنائية مفعلة بالفعل');
    });
  });

  describe('verifyMFA', () => {
    it('should verify valid token and enable MFA for first-time setup', async () => {
      const userId = 'user-123';
      const token = '123456';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        mfaEnabled: false,
        mfaSecret: 'ABCDEFGHIJKLMNOP',
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      (db.update as any).mockReturnValue(mockUpdateChain);

      vi.mocked(authenticator.verify).mockReturnValue(true);

      const result = await service.verifyMFA(userId, token);

      expect(result).toEqual({
        success: true,
        message: 'تم التحقق بنجاح',
      });

      // Should enable MFA since it wasn't enabled before
      expect(db.update).toHaveBeenCalled();
    });

    it('should verify valid token for already-enabled MFA', async () => {
      const userId = 'user-123';
      const token = '123456';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        mfaEnabled: true,
        mfaSecret: 'ABCDEFGHIJKLMNOP',
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      vi.mocked(authenticator.verify).mockReturnValue(true);

      const result = await service.verifyMFA(userId, token);

      expect(result.success).toBe(true);
      // Should NOT update since MFA is already enabled
      expect(db.update).not.toHaveBeenCalled();
    });

    it('should return failure for invalid token', async () => {
      const userId = 'user-123';
      const token = '000000';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        mfaEnabled: true,
        mfaSecret: 'ABCDEFGHIJKLMNOP',
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      vi.mocked(authenticator.verify).mockReturnValue(false);

      const result = await service.verifyMFA(userId, token);

      expect(result).toEqual({
        success: false,
        message: 'رمز التحقق غير صحيح',
      });
    });

    it('should throw error if user not found', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      await expect(service.verifyMFA('nonexistent', '123456')).rejects.toThrow('المستخدم غير موجود');
    });

    it('should throw error if MFA not setup', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: false,
        mfaSecret: null,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      await expect(service.verifyMFA('user-123', '123456')).rejects.toThrow('لم يتم إعداد المصادقة الثنائية');
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA successfully', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        mfaEnabled: true,
        mfaSecret: 'ABCDEFGHIJKLMNOP',
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      const mockUpdateChain = {
        set: vi.fn().mockReturnThis(),
        where: vi.fn().mockResolvedValue(undefined),
      };
      (db.update as any).mockReturnValue(mockUpdateChain);

      await service.disableMFA(userId);

      expect(db.update).toHaveBeenCalled();
      expect(mockUpdateChain.set).toHaveBeenCalledWith({
        mfaEnabled: false,
        mfaSecret: null,
        updatedAt: expect.any(Date),
      });
    });

    it('should throw error if user not found', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      await expect(service.disableMFA('nonexistent')).rejects.toThrow('المستخدم غير موجود');
    });

    it('should throw error if MFA not enabled', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: false,
        mfaSecret: null,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      await expect(service.disableMFA('user-123')).rejects.toThrow('المصادقة الثنائية غير مفعلة');
    });
  });

  describe('isMFAEnabled', () => {
    it('should return true if MFA is enabled', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: true,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      const result = await service.isMFAEnabled('user-123');

      expect(result).toBe(true);
    });

    it('should return false if MFA is not enabled', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: false,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      const result = await service.isMFAEnabled('user-123');

      expect(result).toBe(false);
    });

    it('should throw error if user not found', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      await expect(service.isMFAEnabled('nonexistent')).rejects.toThrow('المستخدم غير موجود');
    });
  });

  describe('validateToken', () => {
    it('should return true for valid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: true,
        mfaSecret: 'ABCDEFGHIJKLMNOP',
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      vi.mocked(authenticator.verify).mockReturnValue(true);

      const result = await service.validateToken('user-123', '123456');

      expect(result).toBe(true);
    });

    it('should return false for invalid token', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: true,
        mfaSecret: 'ABCDEFGHIJKLMNOP',
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      vi.mocked(authenticator.verify).mockReturnValue(false);

      const result = await service.validateToken('user-123', '000000');

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      const result = await service.validateToken('nonexistent', '123456');

      expect(result).toBe(false);
    });

    it('should return false if MFA not enabled', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        mfaEnabled: false,
        mfaSecret: null,
      };

      const mockSelectChain = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([mockUser]),
      };
      (db.select as any).mockReturnValue(mockSelectChain);

      const result = await service.validateToken('user-123', '123456');

      expect(result).toBe(false);
    });
  });

  describe('singleton export', () => {
    it('should export a singleton instance', () => {
      expect(mfaService).toBeDefined();
      expect(mfaService).toBeInstanceOf(MFAService);
    });
  });
});
