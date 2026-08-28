import { useCallback, useMemo } from 'react';
import { useHistory } from '@/lib/historyManager';
import { Layer, EditorState, LayerType } from '../types';

export function useLayers() {
  const { state, setState, undo, redo, canUndo, canRedo } = useHistory<EditorState>({
    layers: [],
    selectedLayerId: null,
  });

  const layers = useMemo(() => {
    return [...state.layers].sort((a, b) => a.zIndex - b.zIndex);
  }, [state.layers]);

  const toggleVisibility = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    }));
  }, [setState]);

  const deleteLayer = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.filter((l) => l.id !== id),
      selectedLayerId: prev.selectedLayerId === id ? null : prev.selectedLayerId,
    }));
  }, [setState]);

  const selectLayer = useCallback((id: string | null) => {
    setState((prev) => ({ ...prev, selectedLayerId: id }));
  }, [setState]);

  const updateLayerData = useCallback((id: string, data: any) => {
    setState((prev) => ({
      ...prev,
      layers: prev.layers.map((l) => (l.id === id ? { ...l, data: { ...l.data, ...data } } : l)),
    }));
  }, [setState]);

  const bringToFront = useCallback((id: string) => {
    setState((prev) => {
      const maxZ = Math.max(...prev.layers.map((l) => l.zIndex), 0);
      return {
        ...prev,
        layers: prev.layers.map((l) => (l.id === id ? { ...l, zIndex: maxZ + 1 } : l)),
      };
    });
  }, [setState]);

  const addLayer = useCallback((layer: Layer) => {
    setState((prev) => ({
      ...prev,
      layers: [...prev.layers, layer],
    }));
  }, [setState]);

  const restore = useCallback((next: EditorState) => setState(next), [setState]);

  return {
    layers,
    selectedLayerId: state.selectedLayerId,
    addLayer,
    toggleVisibility,
    deleteLayer,
    selectLayer,
    updateLayerData,
    bringToFront,
    undo,
    redo,
    canUndo,
    canRedo,
    restore,
  };
}
