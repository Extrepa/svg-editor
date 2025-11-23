import { useCallback } from 'react';
import { useAppContext } from '../context/AppContext';
import { getAllAttributes, findParentGroup } from '../utils/helpers';
import type { PathData, GroupData } from '../types';

export function usePathExtraction() {
    const { state, updateState } = useAppContext();

    const extractPaths = useCallback(() => {
        if (!state.svgElement) return;

        const paths: PathData[] = [];
        const allPaths = state.svgElement.querySelectorAll('path');
        const existingIds = new Set(Array.from(allPaths).map(p => p.id).filter(Boolean));
        let pathIdCounter = existingIds.size;

        allPaths.forEach((path) => {
            if (!path.id) {
                let candidate = `path-${pathIdCounter++}`;
                while (existingIds.has(candidate)) {
                    candidate = `path-${pathIdCounter++}`;
                }
                path.id = candidate;
                existingIds.add(candidate);
            }

            const pathData: PathData = {
                id: path.id,
                element: path,
                d: path.getAttribute('d') || '',
                fill: path.getAttribute('fill') || 'none',
                stroke: path.getAttribute('stroke') || 'none',
                strokeWidth: path.getAttribute('stroke-width') || '0',
                transform: path.getAttribute('transform') || '',
                opacity: path.getAttribute('opacity') || '1',
                style: path.getAttribute('style') || '',
                dataRegion: path.getAttribute('data-region') || '',
                parentGroup: findParentGroup(path),
                attributes: getAllAttributes(path),
            };
            paths.push(pathData);
        });

        updateState({ paths, pathIdCounter });
    }, [state.svgElement, updateState]);

    const extractGroups = useCallback(() => {
        if (!state.svgElement) return;

        const groups: GroupData[] = [];
        const allGroups = state.svgElement.querySelectorAll('g');

        allGroups.forEach((group, index) => {
            const groupData: GroupData = {
                id: group.id || `group-${index}`,
                element: group,
                paths: Array.from(group.querySelectorAll('path')).map(p =>
                    state.paths.findIndex(pp => pp.element === p)
                ).filter(i => i !== -1),
                dataRegion: group.getAttribute('data-region') || '',
                transform: group.getAttribute('transform') || '',
                attributes: getAllAttributes(group),
            };
            groups.push(groupData);
        });

        updateState({ groups });
    }, [state.svgElement, state.paths, updateState]);

    return {
        extractPaths,
        extractGroups,
    };
}

