import { NextAuthOptions, getServerSession as nextAuthGetServerSession } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import prisma from "@/lib/prisma";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string | null;
      isAdmin: boolean;
      pointsBalance: number;
      usdcBalance: number;
      portalBalance: number;
    };
  }

  interface User {
    isAdmin: boolean;
    pointsBalance: number;
    usdcBalance: number;
    portalBalance: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    isAdmin: boolean;
    pointsBalance: number;
    usdcBalance: number;
    portalBalance: number;
  }
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.passwordHash) {
          throw new Error("Invalid email or password");
        }

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash);

        if (!isValid) {
          throw new Error("Invalid email or password");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          isAdmin: user.isAdmin,
          pointsBalance: user.pointsBalance,
          usdcBalance: user.usdcBalance,
          portalBalance: (user as any).portalBalance ?? 0,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
        token.pointsBalance = user.pointsBalance;
        token.usdcBalance = user.usdcBalance;
        token.portalBalance = user.portalBalance ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.isAdmin = token.isAdmin;

        // Always fetch fresh balances from DB
        try {
          const freshUser = await prisma.user.findUnique({
            where: { id: token.id },
            select: { pointsBalance: true, usdcBalance: true, portalBalance: true },
          });
          if (freshUser) {
            session.user.pointsBalance = freshUser.pointsBalance;
            session.user.usdcBalance = freshUser.usdcBalance;
            session.user.portalBalance = freshUser.portalBalance;
          } else {
            session.user.pointsBalance = token.pointsBalance;
            session.user.usdcBalance = token.usdcBalance;
            session.user.portalBalance = token.portalBalance;
          }
        } catch {
          session.user.pointsBalance = token.pointsBalance;
          session.user.usdcBalance = token.usdcBalance;
          session.user.portalBalance = token.portalBalance;
        }
      }
      return session;
    },
  },
};

export async function getServerAuthSession() {
  return nextAuthGetServerSession(authOptions);
}
