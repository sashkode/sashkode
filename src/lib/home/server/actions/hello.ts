'use server';

import 'server-only';

import { z } from 'zod';

import { createServerAction, ErrorCode, ServerError } from '~/lib/actions/server/safe-action-client';

const helloSchema = z.object({
  message: z.string(),
});

export const helloAction = createServerAction({ actionName: 'hello-world' })
  .inputSchema(helloSchema)
  .action(async ({ parsedInput: { message }, ctx: { logger } }) => {
    // For now, just log the message for demonstration
    logger.info('Received message:', { message });

    if (Math.random() < 0.5) {
      throw new ServerError('Simulated server error. Please try again later.', ErrorCode.SERVICE_UNAVAILABLE);
    }

    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 200));

    return {
      success: true,
    };
  });
