import type { ReactNode } from 'react';

export const DndContext = ({ children }: { children: ReactNode }) => children as never;
export const DragOverlay = ({ children }: { children?: ReactNode }) => (children ?? null) as never;
export class PointerSensor {}
export class TouchSensor {}
export const useSensor = () => ({});
export const useSensors = () => [];

export type DragStartEvent = { active: { id: string | number } };
export type DragOverEvent = { active: { id: string | number }; over: { id: string | number } | null };
export type DragEndEvent = { active: { id: string | number }; over: { id: string | number } | null };
