export function handleRequests(retryDelay?: number, retryCount?: number): MethodDecorator {
  return function (
    target: Record<string, unknown>,

    propertyKey: string | symbol,

    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;

    if (!retryDelay) retryDelay = 1000;

    if (!retryCount) retryCount = 2;

    descriptor.value = async function (...args: any) {
      let resp: any;

      let searching = true;

      let counter = 0;

      do {
        resp = await original
          .apply(this, args)

          .catch(e => {
            console.log(e);
            counter++;
            return e;
          })

          .then(r => {
            searching = false;
            return r;
          });

        // rate limit to be safe

        await new Promise(resolve => {
          setTimeout(resolve, retryDelay);
        });
      } while (searching && counter < retryCount);

      return resp;
    };
  };
}
