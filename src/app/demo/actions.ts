'use server';

import { redirect } from 'next/navigation';

import z from 'zod';

import { ServerAction } from '~/lib/actions/server/safe-action-client';

export const demoAction = ServerAction.create({
  name: 'demo-action',
})
  .inputSchema(
    z.object({
      message: z.string(),
    }),
  )
  .action(async ({ parsedInput: { message } }) => {
    redirect(`?msg=${encodeURIComponent(message)}`);
  });
