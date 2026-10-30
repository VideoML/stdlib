/** A disposal signal that releases waits without leaving late rejections unhandled. */
export function createCancellation() {
  let cancel!:()=>void;
  const cancelled=new Promise<void>(resolve=>{cancel=resolve});
  return {
    cancel,
    wait<T>(operation:PromiseLike<T> | T):Promise<T> {
      return Promise.race([Promise.resolve(operation),cancelled.then(()=>{throw new Error('Effect disposed')})]);
    },
  };
}
