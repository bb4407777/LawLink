import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 12 * 60 * 60 }, // 12h
  pages: {
    signIn: "/login"
  },
  providers: [
    CredentialsProvider({
      name: "邮箱密码",
      credentials: {
        email: { label: "邮箱", type: "email" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email }
        });
        if (!user || !user.active) return null;

        const matches = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!matches) return null;

        // 更新最后登录时间（异步，不阻塞）
        prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() }
        }).catch(() => {
          // 忽略更新失败
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.avatar = user.avatar;
      }
      // 每次请求从 DB 刷新姓名和角色（用户可能在后台被修改）
      if (token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: { name: true, role: true, avatar: true, active: true }
          });
          if (dbUser && dbUser.active) {
            token.name = dbUser.name;
            token.role = dbUser.role;
            token.avatar = dbUser.avatar;
          }
        } catch {
          // 忽略 DB 查询失败，沿用 token 中的值
        }
      }
      // trigger 为 "update" 时强制刷新 session
      if (trigger === "update") {
        // session update 由客户端 useSession().update() 触发，此处透传
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.name = token.name ?? session.user.name;
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatar = token.avatar as string | null;
      }
      return session;
    }
  }
};
