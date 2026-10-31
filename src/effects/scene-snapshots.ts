/** Data-only planning: cycles are scene-based; output identities include the fixed source frame. */
export type SceneSnapshotRequest = Readonly<{
    sceneId: string;
    frame: number;
}>;
export function planSceneSnapshots(scenes: Readonly<Record<string, ReadonlyArray<SceneSnapshotRequest>>>, roots: ReadonlyArray<SceneSnapshotRequest>): SceneSnapshotRequest[] {
    const output: SceneSnapshotRequest[] = [], done = new Set<string>(), visiting = new Set<string>();
    const visit = (request: SceneSnapshotRequest, depth: number) => {
        if (!request || typeof request.sceneId !== 'string' || !request.sceneId || !Number.isSafeInteger(request.frame) || request.frame < 0 || !Object.hasOwn(scenes, request.sceneId))
            throw new Error('SCENE_CAPTURE_INVALID');
        if (depth > 8)
            throw new Error('SCENE_CAPTURE_LIMIT: depth');
        if (visiting.has(request.sceneId))
            throw new Error('SCENE_CAPTURE_CYCLE');
        const key = JSON.stringify([request.sceneId, request.frame]);
        if (done.has(key))
            return;
        visiting.add(request.sceneId);
        for (const child of scenes[request.sceneId])
            visit(child, depth + 1);
        visiting.delete(request.sceneId);
        if (!done.has(key)) {
            if (output.length >= 4)
                throw new Error('SCENE_CAPTURE_LIMIT: snapshots');
            done.add(key);
            output.push({ sceneId: request.sceneId, frame: request.frame });
        }
    };
    for (const request of roots)
        visit(request, 1);
    return output;
}
