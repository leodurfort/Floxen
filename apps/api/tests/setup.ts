import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Ensure DB URL exists to satisfy Prisma config during imports (even if tests do not hit DB).
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://postgres:TGVvrsGqOnSSoUjgPETPJJIMHPhKjgHQ@postgres.railway.internal:5432/railway';
}
