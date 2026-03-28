import { NextResponse } from "next/server";
import { getServerAuthSession } from "@/lib/auth";
import prisma from "@/lib/prisma";

/**
 * GET /api/wallet/balance
 *
 * Returns the authenticated user's USDC balance, points balance,
 * and the 20 most recent transactions.
 */
export async function GET() {
  try {
    const session = await getServerAuthSession();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const [user, recentTransactions] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          usdcBalance: true,
          pointsBalance: true,
          portalBalance: true,
        },
      }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          paymentMethod: true,
          status: true,
          pointsEarned: true,
          createdAt: true,
          giftCard: {
            select: {
              brand: true,
              denomination: true,
            },
          },
        },
      }),
    ]);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      usdcBalance: user.usdcBalance,
      pointsBalance: user.pointsBalance,
      portalBalance: user.portalBalance,
      recentTransactions,
    });
  } catch (error) {
    console.error("Wallet balance error:", error);
    return NextResponse.json(
      { error: "Failed to fetch wallet balance" },
      { status: 500 }
    );
  }
}
