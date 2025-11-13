import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
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

  recordings: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserRecordings } = await import("../db");
      return getUserRecordings(ctx.user.id);
    }),
    
    get: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "id" in val) {
          return { id: (val as { id: unknown }).id };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        const { getRecording } = await import("../db");
        return getRecording(Number(input.id));
      }),
    
    create: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null) {
          const obj = val as Record<string, unknown>;
          return {
            fileName: obj.fileName as string,
            fileSize: obj.fileSize as number,
            filePath: obj.filePath as string,
            duration: obj.duration as number | undefined,
          };
        }
        throw new Error("Invalid input");
      })
      .mutation(async ({ ctx, input }) => {
        const { createRecording } = await import("../db");
        return createRecording({
          userId: ctx.user.id,
          ...input,
        });
      }),
  }),

  transcriptions: router({
    get: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "recordingId" in val) {
          return { recordingId: (val as { recordingId: unknown }).recordingId };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        const { getTranscription } = await import("../db");
        return getTranscription(Number(input.recordingId));
      }),
  }),

  analyses: router({
    getByRecording: protectedProcedure
      .input((val: unknown) => {
        if (typeof val === "object" && val !== null && "recordingId" in val) {
          return { recordingId: (val as { recordingId: unknown }).recordingId };
        }
        throw new Error("Invalid input");
      })
      .query(async ({ input }) => {
        const { getRecordingAnalyses } = await import("../db");
        return getRecordingAnalyses(Number(input.recordingId));
      }),
  }),
});

export type AppRouter = typeof appRouter;
