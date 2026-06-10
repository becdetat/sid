import type { ReactNode } from 'react';

export const SortableContext = ({ children }: { children: ReactNode }) => children as never;
export const useSortable = () => ({
    attributes: {},
    listeners: {},
    setNodeRef: () => {},
    transform: null,
    transition: undefined,
    isDragging: false,
});
export const verticalListSortingStrategy = {};
export const arrayMove = <T,>(arr: T[], from: number, to: number): T[] => {
    const result = [...arr];
    const [item] = result.splice(from, 1);
    result.splice(to, 0, item);
    return result;
};
