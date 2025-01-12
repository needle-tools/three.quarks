import {VFXBatch, RenderMode, StoredBatchSettings} from './VFXBatch';
import {ParticleSystem, VFXBatchSettings} from './ParticleSystem';
import {Object3D} from 'three';
import {SpriteBatch} from './SpriteBatch';
import {TrailBatch} from './TrailBatch';

/**
 * the class represents the batch renderer. a three.js scene should only have one batchedRenderer
 * It keeps references of all particle systems and rendering batch.
 * It batches all particle systems that has the same rendering pipeline to a single VFXBatch.
 */
export class BatchedRenderer extends Object3D {
    batches: Array<VFXBatch> = [];
    systemToBatchIndex: Map<ParticleSystem, number> = new Map<ParticleSystem, number>();
    type = 'BatchedRenderer';

    constructor() {
        super();
    }

    private static equals(a: StoredBatchSettings, b: VFXBatchSettings) {
        return (
            a.material.side === b.material.side &&
            a.material.blending === b.material.blending &&
            a.material.transparent === b.material.transparent &&
            a.material.type === b.material.type &&
            a.material.alphaTest === b.material.alphaTest &&
            (a.material as any).map === (b.material as any).map &&
            a.renderMode === b.renderMode &&
            a.uTileCount === b.uTileCount &&
            a.vTileCount === b.vTileCount &&
            a.instancingGeometry === b.instancingGeometry &&
            a.renderOrder === b.renderOrder &&
            a.layers.mask === b.layers.mask
        );
    }

    addSystem(system: ParticleSystem) {
        system._renderer = this;
        const settings = system.getRendererSettings();
        for (let i = 0; i < this.batches.length; i++) {
            if (BatchedRenderer.equals(this.batches[i].settings, settings)) {
                this.batches[i].addSystem(system);
                this.systemToBatchIndex.set(system, i);
                return;
            }
        }
        let batch;
        switch (settings.renderMode) {
            case RenderMode.Trail:
                batch = new TrailBatch(settings);
                break;
            case RenderMode.Mesh:
            case RenderMode.BillBoard:
            case RenderMode.StretchedBillBoard:
                batch = new SpriteBatch(settings);
                break;
        }
        batch.addSystem(system);
        this.batches.push(batch);
        this.systemToBatchIndex.set(system, this.batches.length - 1);
        this.add(batch);
    }

    deleteSystem(system: ParticleSystem) {
        const batchIndex = this.systemToBatchIndex.get(system);
        if (batchIndex != undefined) {
            this.batches[batchIndex].removeSystem(system);
            this.systemToBatchIndex.delete(system);
        }
        /*const settings = system.getRendererSettings();
        for (let i = 0; i < this.batches.length; i++) {
            if (BatchedParticleRenderer.equals(this.batches[i].settings, settings)) {
                this.batches[i].removeSystem(system);
                return;
            }
        }*/
    }

    updateSystem(system: ParticleSystem) {
        this.deleteSystem(system);
        this.addSystem(system);
    }

    update(delta: number) {
        this.systemToBatchIndex.forEach((value, ps) => {
            (ps as any).update(delta);
        });
        for (let i = 0; i < this.batches.length; i++) {
            this.batches[i].update();
        }
    }
}
