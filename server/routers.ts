import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { getAllCustomers, getCustomerCount, getCustomerById, createCustomer, updateCustomer, deleteCustomer } from "./db";

const PRIORITY_ENUM = [
  "S級-確認待收款",
  "A級-優質跟進客戶",
  "B級-跟進客戶",
  "C級-養成客戶",
  "D級-低價值無效客戶",
  "E級-永久無需求",
  "聯繫名單失效",
  "客戶要求拒絕往來",
  "黑名單",
] as const;

const CLASSIFICATION_ENUM = ["鯨魚", "鯊魚", "小魚", "小蝦"] as const;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  customers: router({
    list: publicProcedure
      .input(z.object({ 
        page: z.number().int().positive().default(1), 
        limit: z.number().int().positive().default(10) 
      }))
      .query(async ({ input }) => {
        const offset = (input.page - 1) * input.limit;
        const [customerList, total] = await Promise.all([
          getAllCustomers(input.limit, offset),
          getCustomerCount(),
        ]);
        return {
          customers: customerList,
          total,
          page: input.page,
          limit: input.limit,
          pages: Math.ceil(total / input.limit),
        };
      }),
    get: publicProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .query(async ({ input }) => {
        return getCustomerById(input.id);
      }),
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        priority: z.enum(PRIORITY_ENUM).optional(),
        classification: z.enum(CLASSIFICATION_ENUM).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return createCustomer(input);
      }),
    update: protectedProcedure
      .input(z.object({
        id: z.number().int().positive(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        company: z.string().optional(),
        priority: z.enum(PRIORITY_ENUM).optional(),
        classification: z.enum(CLASSIFICATION_ENUM).optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return updateCustomer(id, data);
      }),
    delete: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(async ({ input }) => {
        return deleteCustomer(input.id);
      }),
    seed: protectedProcedure
      .mutation(async () => {
        const seedCustomers = [
          {
            name: "台灣科技股份有限公司",
            email: "contact@taiwantech.com",
            phone: "02-1234-5678",
            company: "台灣科技股份有限公司",
            priority: "S級-確認待收款" as const,
            classification: "鯨魚" as const,
            notes: "大型企業客戶，月訂單金額 $100,000+",
          },
          {
            name: "創意設計工作室",
            email: "hello@creativestudio.tw",
            phone: "03-9876-5432",
            company: "創意設計工作室",
            priority: "A級-優質跟進客戶" as const,
            classification: "鯊魚" as const,
            notes: "設計服務提供商，有持續合作潛力",
          },
          {
            name: "綠色環保公司",
            email: "info@greeneco.com",
            phone: "04-5555-6666",
            company: "綠色環保公司",
            priority: "B級-跟進客戶" as const,
            classification: "小魚" as const,
            notes: "環保相關企業，正在評估產品",
          },
          {
            name: "王小明",
            email: "wang.xiaoming@email.com",
            phone: "0912-345-678",
            company: "個人工作室",
            priority: "C級-養成客戶" as const,
            classification: "小蝦" as const,
            notes: "自由工作者，需要定期跟進",
          },
          {
            name: "李美麗",
            email: "li.meili@example.com",
            phone: "0923-456-789",
            company: "美麗顧問有限公司",
            priority: "B級-跟進客戶" as const,
            classification: "小魚" as const,
            notes: "美容諮詢服務，有中期合作機會",
          },
        ];
        
        const results = [];
        for (const customer of seedCustomers) {
          const result = await createCustomer(customer);
          results.push(result);
        }
        return { success: true, count: results.length };
      }),
  }),
});

export type AppRouter = typeof appRouter;
