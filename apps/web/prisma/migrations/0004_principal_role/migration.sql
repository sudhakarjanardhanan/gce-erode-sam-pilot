-- Add PRINCIPAL role to align institutional dashboard access
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'PRINCIPAL';
