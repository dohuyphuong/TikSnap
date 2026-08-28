import { useState, useCallback } from 'react';

/**
 * Hook quản lý trạng thái Undo/Redo cho các thao tác chỉnh sửa ảnh.
 * @param initialState Trạng thái ban đầu của ảnh/cấu hình chỉnh sửa
 */
export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<T[]>([initialState]);
  const [index, setIndex] = useState(0);

  const setState = useCallback((newState: T | ((prev: T) => T)) => {
    setHistory((prev) => {
      const currentState = prev[index];
      const nextState = typeof newState === 'function' ? (newState as (prev: T) => T)(currentState) : newState;
      
      // Chỉ lưu nếu có thay đổi
      if (nextState === currentState) return prev;

      const newHistory = prev.slice(0, index + 1);
      newHistory.push(nextState);
      
      // Giới hạn lịch sử để tránh leak memory (tối đa 20 thao tác)
      if (newHistory.length > 20) {
        newHistory.shift();
        setIndex(newHistory.length - 1);
      } else {
        setIndex(newHistory.length - 1);
      }
      
      return newHistory;
    });
  }, [index]);

  const undo = useCallback(() => {
    if (index > 0) {
      setIndex((i) => i - 1);
    }
  }, [index]);

  const redo = useCallback(() => {
    if (index < history.length - 1) {
      setIndex((i) => i + 1);
    }
  }, [index, history.length]);

  return {
    state: history[index],
    setState,
    undo,
    redo,
    canUndo: index > 0,
    canRedo: index < history.length - 1,
  };
}
