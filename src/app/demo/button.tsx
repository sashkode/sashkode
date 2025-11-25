'use client';

import { useAction } from 'next-safe-action/hooks';

import { usePageContext } from '~/lib/navigation/client/hooks/use-page';

import { demoAction } from './actions';
import type DemoPage from './page';

export const MsgButton = ({ message }: { message: string }) => {
  const { executeAsync } = useAction(demoAction);
  const demoPageContext = usePageContext<typeof DemoPage>();
  //   const demoPageContext2 = usePage<typeof DemoPage>();
  //   const demoPageContext3 = usePageFallback<typeof DemoPage>();

  return (
    <button type="button" onClick={() => executeAsync({ message })}>
      Default{' '}
      {JSON.stringify(
        {
          demoPageContext,
        },
        null,
        2,
      )}
    </button>
  );
};
