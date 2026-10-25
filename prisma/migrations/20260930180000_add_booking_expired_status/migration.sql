-- AlterEnum
-- Agendamentos que não foram pagos dentro do prazo passam a ficar EXPIRED.
ALTER TYPE "BookingStatus" ADD VALUE 'EXPIRED';
