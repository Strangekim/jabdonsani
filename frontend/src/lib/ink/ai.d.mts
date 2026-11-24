import type { Command, GameView, EngineState } from './engine.mjs';
export type AiProfile = 'balanced' | 'expand' | 'attack' | 'builder';
export type Seat = 'human' | AiProfile;
export type AiResult = { command: Command; evaluated: number; value: number; planned: Command[] };
export const PROFILES: Record<AiProfile,{label:string;gain:number;attack:number;reach:number;building:number;trap:number;reinforce:number}>;
export function fromPublicView(view: GameView): EngineState;
export function chooseAction(view: GameView, profile?: AiProfile, options?: {fast?:boolean}): AiResult;
