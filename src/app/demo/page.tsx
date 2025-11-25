import z from 'zod';

import { Page } from '~/lib/navigation/server/next-safe-page';

import { MsgButton } from './button';

export default Page.create({
  path: '/demo',
  name: 'demo',
})
  .searchParamsSchema(
    {
      msg: z.string().min(5).optional(),
    },
    () => {
      return (
        <>
          <h1>Oops, no message!</h1>
          <MsgButton message="message!" />
        </>
      );
    },
  )
  .page(async () => {
    // const { msg } = await getSearchParams();
    return (
      <div>
        {/* <h1>{msg}</h1> */}
        <MsgButton message="message!" />
      </div>
    );
  });
