/** One-shot draw completion signals; failure is terminal for this sketch. */
export class DrawWaiters {
  private pending:Array<{resolve:()=>void;reject:(error:unknown)=>void}>=[];
  private failed=false;
  private error:unknown;
  next():Promise<void> {
    if(this.failed) return Promise.reject(this.error);
    return new Promise((resolve,reject)=>this.pending.push({resolve,reject}));
  }
  complete():void { for(const waiter of this.pending.splice(0)) waiter.resolve(); }
  fail(error:unknown):void {
    if(this.failed) return;
    this.failed=true; this.error=error;
    for(const waiter of this.pending.splice(0)) waiter.reject(error);
  }
}
