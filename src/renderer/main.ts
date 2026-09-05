import type { SpeciesConfig } from '../shared/speciesSchema';
import type { PetState } from '../shared/petState';
import { PetStateMachine } from './PetStateMachine';
import { AnimationController } from './AnimationController';
import { PetRenderer } from './PetRenderer';
import { BehaviorController } from './BehaviorController';
import { InputController } from './InputController';
import { ProgressionController } from './ProgressionController';
import type { Rect } from './types';

async function main(): Promise<void> {
  const canvas = document.getElementById('pet-canvas') as HTMLCanvasElement;
  const renderer = new PetRenderer(canvas);
  const stateMachine = new PetStateMachine();
  const animationController = new AnimationController();

  const [workArea, initialPlaytimeMs]: [Rect, number] = await Promise.all([
    window.petAPI.getWorkArea(),
    window.petAPI.getPlaytimeMs(),
  ]);
  const startPosition = { x: workArea.width / 2, y: workArea.height / 2 };

  let species: SpeciesConfig | null = null;
  let behavior: BehaviorController | null = null;
  let input: InputController | null = null;
  let progression: ProgressionController | null = null;

  window.petAPI.onSpeciesLoaded((loaded) => {
    // A reload (live species-file editing, not just the initial load) means
    // this fires more than once — always tear down the previous
    // InputController's listeners and drop cached sprite images (a stale
    // decoded bitmap would otherwise keep showing under the same URL) before
    // replacing everything.
    input?.destroy();
    renderer.clearCache();

    species = loaded;
    const position = behavior?.getPosition() ?? startPosition;
    progression = new ProgressionController(loaded.progression ?? [], initialPlaytimeMs);
    behavior = new BehaviorController(stateMachine, loaded.behavior, position, () =>
      progression!.getUnlockedIdleVariants(),
    );
    input = new InputController(canvas, renderer, behavior, (id) =>
      progression!.isInteractionUnlocked(id),
    );

    const idleDef = loaded.animations.idle;
    if (idleDef) {
      animationController.setAnimation(idleDef);
      input.setCurrentAnimation(idleDef, loaded.behavior.spriteScale);
    }
  });

  window.petAPI.onVisibilityToggled(() => {
    // Renderer keeps running regardless; the window itself is hidden/shown by main.
  });

  stateMachine.onChange((next: PetState) => {
    if (!species || !input) return;
    const def = species.animations[next] ?? species.animations.idle;
    if (!def) return;
    animationController.setAnimation(def);
    input.setCurrentAnimation(def, species.behavior.spriteScale);
  });

  let lastTimestamp = performance.now();

  function tick(timestamp: number): void {
    const deltaMs = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    if (species && behavior && progression) {
      progression.advance(deltaMs);

      const currentState = stateMachine.getState();
      const currentDef = species.animations[currentState] ?? species.animations.idle;
      if (currentDef) {
        behavior.update(deltaMs, workArea, currentDef.frameWidth * species.behavior.spriteScale);
        animationController.update(deltaMs);

        if (currentState === 'react' && animationController.isFinished()) {
          behavior.endReaction();
        }

        const frame = animationController.getCurrentFrameRect();
        if (frame) {
          renderer.render(currentDef, frame, behavior.getPosition(), species.behavior.spriteScale);
        }
      }
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

void main();
