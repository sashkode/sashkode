'use client';

import { useAction } from 'next-safe-action/hooks';

import { helloAction } from '~/lib/home/server/actions/hello';

export const HelloButton = () => {
  const { executeAsync, status } = useAction(helloAction);

  const handleClick = async () => {
    const result = await executeAsync({ message: 'Hello from the client!' });
    // biome-ignore lint/suspicious/noConsole: Debugging
    console.log('Action result:', result);
  };

  return (
    <button type="button" onClick={handleClick} disabled={['executing', 'transitioning'].includes(status)} className="rounded bg-blue-500 px-4 py-2 text-white">
      Say Hello
    </button>
  );
};
