-- Add gender field to Student for gender-balanced team formation
-- Values: 'M' (Male), 'F' (Female), NULL (not specified)

ALTER TABLE "Student" ADD COLUMN "gender" TEXT;
