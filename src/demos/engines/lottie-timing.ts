/** Convert absolute project frames to the local asset's frame rate, then wrap or clamp. */
export function resolveLottieFrame(frame:number, projectFps:number, assetFps:number, totalFrames:number, loop:boolean):number {
  if (!Number.isSafeInteger(frame) || frame<0 || !Number.isFinite(projectFps) || projectFps<=0 || !Number.isFinite(assetFps) || assetFps<=0 || !Number.isFinite(totalFrames) || totalFrames<1) throw new Error('Invalid Lottie frame or timing');
  const count=Math.floor(totalFrames);
  const assetFrame=Math.round(frame/projectFps*assetFps);
  return loop ? assetFrame % count : Math.min(count-1,assetFrame);
}
