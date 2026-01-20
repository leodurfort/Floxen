import { prisma } from '../lib/prisma';
import { sendEmail } from '../lib/mailer';
import { getDeletionScheduledEmailHtml, getDeletionCancelledEmailHtml } from './emailTemplates';

const DELETION_GRACE_PERIOD_DAYS = 30;

export async function scheduleAccountDeletion(userId: string): Promise<{
  success: boolean;
  scheduledFor?: Date;
  error?: string;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accountDeletion: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Check if deletion is already scheduled
    if (user.accountDeletion && !user.accountDeletion.cancelledAt) {
      return {
        success: false,
        error: 'Account deletion is already scheduled',
      };
    }

    const scheduledFor = new Date();
    scheduledFor.setDate(scheduledFor.getDate() + DELETION_GRACE_PERIOD_DAYS);

    // Create or update deletion record
    if (user.accountDeletion) {
      // Reactivate cancelled deletion
      await prisma.accountDeletion.update({
        where: { id: user.accountDeletion.id },
        data: {
          scheduledFor,
          requestedAt: new Date(),
          cancelledAt: null,
        },
      });
    } else {
      await prisma.accountDeletion.create({
        data: {
          userId,
          scheduledFor,
          requestedAt: new Date(),
        },
      });
    }

    // Send confirmation email
    const deletionDateStr = scheduledFor.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    await sendEmail({
      to: user.email,
      subject: 'Account Deletion Scheduled - Floxen',
      html: getDeletionScheduledEmailHtml(deletionDateStr),
    });

    return { success: true, scheduledFor };
  } catch (error) {
    console.error('Failed to schedule account deletion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to schedule deletion',
    };
  }
}

export async function cancelAccountDeletion(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { accountDeletion: true },
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (!user.accountDeletion || user.accountDeletion.cancelledAt) {
      return { success: false, error: 'No active deletion scheduled' };
    }

    // Mark as cancelled
    await prisma.accountDeletion.update({
      where: { id: user.accountDeletion.id },
      data: { cancelledAt: new Date() },
    });

    // Send confirmation email
    await sendEmail({
      to: user.email,
      subject: 'Account Deletion Cancelled - Floxen',
      html: getDeletionCancelledEmailHtml(),
    });

    return { success: true };
  } catch (error) {
    console.error('Failed to cancel account deletion:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to cancel deletion',
    };
  }
}

export async function getPendingDeletion(userId: string): Promise<{
  scheduled: boolean;
  scheduledFor?: Date;
  requestedAt?: Date;
}> {
  const deletion = await prisma.accountDeletion.findUnique({
    where: { userId },
  });

  if (!deletion || deletion.cancelledAt) {
    return { scheduled: false };
  }

  return {
    scheduled: true,
    scheduledFor: deletion.scheduledFor,
    requestedAt: deletion.requestedAt,
  };
}

export async function executeScheduledDeletions(): Promise<number> {
  const now = new Date();

  // Find all accounts scheduled for deletion before now
  const pendingDeletions = await prisma.accountDeletion.findMany({
    where: {
      cancelledAt: null,
      scheduledFor: { lte: now },
    },
    include: { user: true },
  });

  let deletedCount = 0;

  for (const deletion of pendingDeletions) {
    try {
      // Delete user and all related data (cascade)
      await prisma.user.delete({
        where: { id: deletion.userId },
      });
      deletedCount++;
      console.log(`Deleted account for user ${deletion.user.email}`);
    } catch (error) {
      console.error(`Failed to delete account ${deletion.userId}:`, error);
    }
  }

  return deletedCount;
}
